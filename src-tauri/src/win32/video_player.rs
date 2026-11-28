//! A muted, looping video drawn into a window by Windows' own engine (Media Foundation's
//! `IMFMediaEngine`). The original file is decoded, on the GPU where the driver can, and scaled
//! straight to the window: nothing is converted or re-encoded.

use std::{
    marker::PhantomData,
    sync::{
        atomic::{AtomicBool, AtomicU32, Ordering},
        Arc,
    },
};

use windows::{
    core::{implement, w, Interface, BSTR, HSTRING, PCWSTR},
    Win32::{
        Foundation::{HMODULE, RECT},
        Graphics::{
            Direct3D::D3D_DRIVER_TYPE_HARDWARE,
            Direct3D10::ID3D10Multithread,
            Direct3D11::{
                D3D11CreateDevice, ID3D11Device, ID3D11DeviceContext, ID3D11Texture2D,
                D3D11_BIND_RENDER_TARGET, D3D11_CPU_ACCESS_READ, D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                D3D11_CREATE_DEVICE_VIDEO_SUPPORT, D3D11_MAPPED_SUBRESOURCE, D3D11_MAP_READ,
                D3D11_SDK_VERSION, D3D11_TEXTURE2D_DESC, D3D11_USAGE_DEFAULT, D3D11_USAGE_STAGING,
            },
            Dxgi::Common::{DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_SAMPLE_DESC},
        },
        Media::MediaFoundation::{
            CLSID_MFMediaEngineClassFactory, IMFAttributes, IMFDXGIDeviceManager,
            IMFMediaEngine, IMFMediaEngineClassFactory, IMFMediaEngineEx, IMFMediaEngineNotify,
            IMFMediaEngineNotify_Impl, MFCreateAttributes, MFCreateDXGIDeviceManager, MFCreateFile,
            MFShutdown, MFStartup, MFVideoNormalizedRect, MFARGB, MFSTARTUP_FULL,
            MF_ACCESSMODE_READ, MF_FILEFLAGS_NONE, MF_MEDIA_ENGINE_CALLBACK,
            MF_MEDIA_ENGINE_DXGI_MANAGER, MF_MEDIA_ENGINE_EVENT_ERROR,
            MF_MEDIA_ENGINE_EVENT_LOADEDMETADATA, MF_MEDIA_ENGINE_PLAYBACK_HWND,
            MF_MEDIA_ENGINE_VIDEO_OUTPUT_FORMAT, MF_OPENMODE_FAIL_IF_NOT_EXIST, MF_VERSION,
        },
        System::{
            Com::{CoCreateInstance, CLSCTX_INPROC_SERVER},
            LibraryLoader::{LoadLibraryExW, LOAD_LIBRARY_SEARCH_SYSTEM32},
        },
    },
};

use super::com::ComApartment;

/// COM and Media Foundation, started for this thread. Keep it alive longer than every player.
pub(crate) struct MediaRuntime {
    // Dropped after `drop` below has shut Media Foundation down.
    _com: ComApartment,
}

impl MediaRuntime {
    pub(crate) fn start() -> Result<Self, String> {
        // mfplat.dll is delay-loaded (build.rs): Windows "N" editions lack it until the Media
        // Feature Pack is added, and calling into a missing delay-loaded DLL would end the app.
        // SAFETY: a constant NUL-terminated name, looked up in System32 only.
        unsafe { LoadLibraryExW(w!("mfplat.dll"), None, LOAD_LIBRARY_SEARCH_SYSTEM32) }
            .map_err(|_| "Windows media features are missing. Install the Media Feature Pack.".to_string())?;
        let com = ComApartment::multithreaded().map_err(|error| error.to_string())?;
        // SAFETY: takes plain values; paired with MFShutdown in Drop.
        unsafe { MFStartup(MF_VERSION, MFSTARTUP_FULL) }.map_err(|error| error.to_string())?;
        Ok(Self { _com: com })
    }
}

impl Drop for MediaRuntime {
    fn drop(&mut self) {
        // SAFETY: pairs the successful MFStartup in `start`.
        let _ = unsafe { MFShutdown() };
    }
}

/// What the engine reported, written from its own threads.
#[derive(Default)]
struct Events {
    loaded: AtomicBool,
    /// An `MF_MEDIA_ENGINE_ERR` code; 0 for none.
    error: AtomicU32,
}

#[implement(IMFMediaEngineNotify)]
struct Notify(Arc<Events>);

impl IMFMediaEngineNotify_Impl for Notify_Impl {
    fn EventNotify(&self, event: u32, param1: usize, _: u32) -> windows::core::Result<()> {
        if event == MF_MEDIA_ENGINE_EVENT_LOADEDMETADATA.0 as u32 {
            self.0.loaded.store(true, Ordering::SeqCst);
        } else if event == MF_MEDIA_ENGINE_EVENT_ERROR.0 as u32 {
            self.0.error.store((param1 as u32).max(1), Ordering::SeqCst);
        }
        Ok(())
    }
}

/// The Direct3D device the decoder shares, with its context for reading a frame back.
struct Gpu {
    manager: IMFDXGIDeviceManager,
    device: ID3D11Device,
    context: ID3D11DeviceContext,
}

/// A Direct3D device the decoder can share, which is what turns hardware decoding on.
fn device_manager() -> windows::core::Result<Gpu> {
    let mut device: Option<ID3D11Device> = None;
    let mut context: Option<ID3D11DeviceContext> = None;
    // SAFETY: the out pointers are valid locals; no adapter or software module is passed.
    unsafe {
        D3D11CreateDevice(None, D3D_DRIVER_TYPE_HARDWARE, HMODULE::default(),
            D3D11_CREATE_DEVICE_BGRA_SUPPORT | D3D11_CREATE_DEVICE_VIDEO_SUPPORT, None,
            D3D11_SDK_VERSION, Some(&mut device), None, Some(&mut context))?;
    }
    let failed = || windows::core::Error::from_hresult(windows::Win32::Foundation::E_FAIL);
    let (device, context) = device.zip(context).ok_or_else(failed)?;
    // SAFETY: the media threads use the device too, so it must lock itself; the manager and token
    // are valid locals.
    unsafe {
        let _ = device.cast::<ID3D10Multithread>()?.SetMultithreadProtected(true);
        let mut token = 0;
        let mut manager = None;
        MFCreateDXGIDeviceManager(&mut token, &mut manager)?;
        let manager = manager.ok_or_else(failed)?;
        manager.ResetDevice(&device, token)?;
        Ok(Gpu { manager, device, context })
    }
}

/// One picture read back from the player: rows of BGRA from the top, with no padding.
pub(crate) struct Still {
    pub(crate) width: i32,
    pub(crate) height: i32,
    pub(crate) bgra: Vec<u8>,
}

pub(crate) struct VideoPlayer {
    engine: IMFMediaEngine,
    events: Arc<Events>,
    /// The engine's own device, which a frame can only be copied out through. None on a machine
    /// that decodes in software.
    gpu: Option<(ID3D11Device, ID3D11DeviceContext)>,
    _thread_bound: PhantomData<*const ()>,
}

impl VideoPlayer {
    /// Opens `path` to be drawn into `window`, paused until [`VideoPlayer::set_playing`].
    pub(crate) fn open(_runtime: &MediaRuntime, window: isize, path: &str) -> Result<Self, String> {
        let events = Arc::new(Events::default());
        Self::create(window, path, events).map_err(|error| format!("Could not open the video: {error}"))
    }

    fn create(window: isize, path: &str, events: Arc<Events>) -> windows::core::Result<Self> {
        let notify: IMFMediaEngineNotify = Notify(events.clone()).into();
        // A software-only machine (or a remote session) still plays, decoding on the processor.
        let gpu = device_manager().ok();
        let mut attributes: Option<IMFAttributes> = None;
        // SAFETY: COM and Media Foundation are running on this thread (the caller holds a
        // MediaRuntime). Every pointer is a valid local or an interface alive for the call.
        let engine = unsafe {
            MFCreateAttributes(&mut attributes, 4)?;
            let attributes = attributes
                .ok_or_else(|| windows::core::Error::from_hresult(windows::Win32::Foundation::E_FAIL))?;
            attributes.SetUnknown(&MF_MEDIA_ENGINE_CALLBACK, &notify)?;
            if let Some(gpu) = &gpu {
                attributes.SetUnknown(&MF_MEDIA_ENGINE_DXGI_MANAGER, &gpu.manager)?;
            }
            attributes.SetUINT64(&MF_MEDIA_ENGINE_PLAYBACK_HWND, window as u64)?;
            attributes.SetUINT32(&MF_MEDIA_ENGINE_VIDEO_OUTPUT_FORMAT, DXGI_FORMAT_B8G8R8A8_UNORM.0 as u32)?;
            let factory: IMFMediaEngineClassFactory =
                CoCreateInstance(&CLSID_MFMediaEngineClassFactory, None, CLSCTX_INPROC_SERVER)?;
            factory.CreateInstance(0, &attributes)?
        };
        let gpu = gpu.map(|gpu| (gpu.device, gpu.context));
        let player = Self { engine, events, gpu, _thread_bound: PhantomData };
        let name = HSTRING::from(path);
        // SAFETY: `name` outlives the calls. The file is handed over as a byte stream so that
        // characters such as # or % in its path are never read as parts of a URL.
        unsafe {
            player.engine.SetMuted(true)?;
            player.engine.SetLoop(true)?;
            player.engine.SetAutoPlay(false)?;
            let stream = MFCreateFile(MF_ACCESSMODE_READ, MF_OPENMODE_FAIL_IF_NOT_EXIST,
                MF_FILEFLAGS_NONE, PCWSTR(name.as_ptr()))?;
            player.engine.cast::<IMFMediaEngineEx>()?.SetSourceFromByteStream(&stream, &BSTR::from(path))?;
        }
        Ok(player)
    }

    /// The video's size and layout are known.
    pub(crate) fn is_loaded(&self) -> bool {
        self.events.loaded.load(Ordering::SeqCst)
    }

    /// The `MF_MEDIA_ENGINE_ERR` code playback stopped with.
    pub(crate) fn error_code(&self) -> Option<u32> {
        Some(self.events.error.load(Ordering::SeqCst)).filter(|code| *code != 0)
    }

    /// Plays or pauses. Pausing keeps the position and the frame on screen.
    pub(crate) fn set_playing(&self, playing: bool) {
        // SAFETY: plain calls on an engine owned by this thread; failures surface as error events.
        unsafe {
            if playing && self.engine.IsPaused().as_bool() {
                let _ = self.engine.Play();
            } else if !playing && !self.engine.IsPaused().as_bool() {
                let _ = self.engine.Pause();
            }
        }
    }

    /// Seconds from the start.
    pub(crate) fn position(&self) -> f64 {
        // SAFETY: takes no arguments.
        unsafe { self.engine.GetCurrentTime() }
    }

    pub(crate) fn seek(&self, seconds: f64) {
        // SAFETY: takes a plain value.
        let _ = unsafe { self.engine.SetCurrentTime(seconds) };
    }

    /// The picture's own size in pixels, once loaded.
    pub(crate) fn video_size(&self) -> Option<(u32, u32)> {
        let (mut width, mut height) = (0, 0);
        // SAFETY: both out pointers are valid locals.
        unsafe { self.engine.GetNativeVideoSize(Some(&mut width), Some(&mut height)) }.ok()?;
        (width > 0 && height > 0).then_some((width, height))
    }

    /// Draws the part `source` (left, top, right, bottom as fractions of the picture) into a
    /// `width` by `height` area, with black around whatever it does not fill.
    pub(crate) fn set_layout(&self, source: [f32; 4], width: i32, height: i32) {
        let source = MFVideoNormalizedRect { left: source[0], top: source[1], right: source[2], bottom: source[3] };
        let target = RECT { left: 0, top: 0, right: width, bottom: height };
        let black = MFARGB { rgbBlue: 0, rgbGreen: 0, rgbRed: 0, rgbAlpha: 255 };
        // SAFETY: the three pointers are valid locals for the duration of the call.
        let _ = unsafe {
            self.engine.cast::<IMFMediaEngineEx>().and_then(|engine| {
                engine.UpdateVideoStream(Some(&source), Some(&target), Some(&black))
            })
        };
    }

    /// The frame on screen now, drawn the way [`VideoPlayer::set_layout`] draws it (`source` is the
    /// same part of the picture) into a `width` by `height` image. None when it cannot be read
    /// back, for instance without a graphics device: the caller then shows black.
    pub(crate) fn still_frame(&self, source: [f32; 4], width: i32, height: i32) -> Option<Still> {
        let (device, context) = self.gpu.as_ref()?;
        let (columns, rows) = (u32::try_from(width).ok()?.max(1), u32::try_from(height).ok()?.max(1));
        let target_description = D3D11_TEXTURE2D_DESC {
            Width: columns,
            Height: rows,
            MipLevels: 1,
            ArraySize: 1,
            Format: DXGI_FORMAT_B8G8R8A8_UNORM,
            SampleDesc: DXGI_SAMPLE_DESC { Count: 1, Quality: 0 },
            Usage: D3D11_USAGE_DEFAULT,
            BindFlags: D3D11_BIND_RENDER_TARGET.0 as u32,
            ..Default::default()
        };
        let staging_description = D3D11_TEXTURE2D_DESC {
            Usage: D3D11_USAGE_STAGING,
            BindFlags: 0,
            CPUAccessFlags: D3D11_CPU_ACCESS_READ.0 as u32,
            ..target_description
        };
        let (mut target, mut staging): (Option<ID3D11Texture2D>, Option<ID3D11Texture2D>) = (None, None);
        // SAFETY: the descriptions and out pointers are valid locals.
        unsafe {
            device.CreateTexture2D(&target_description, None, Some(&mut target)).ok()?;
            device.CreateTexture2D(&staging_description, None, Some(&mut staging)).ok()?;
        }
        let (target, staging) = (target?, staging?);
        let area = MFVideoNormalizedRect { left: source[0], top: source[1], right: source[2], bottom: source[3] };
        let whole = RECT { left: 0, top: 0, right: width.max(1), bottom: height.max(1) };
        let black = MFARGB { rgbBlue: 0, rgbGreen: 0, rgbRed: 0, rgbAlpha: 255 };
        let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
        // SAFETY: both textures are `columns` by `rows` in the same format and belong to the
        // engine's device. A successful Map is paired with the Unmap below.
        unsafe {
            self.engine.TransferVideoFrame(&target, Some(&area), &whole, Some(&black)).ok()?;
            context.CopyResource(&staging, &target);
            context.Map(&staging, 0, D3D11_MAP_READ, 0, Some(&mut mapped)).ok()?;
        }
        let row = columns as usize * 4;
        let mut bgra = vec![0u8; row * rows as usize];
        for (line, out) in bgra.chunks_exact_mut(row).enumerate() {
            // SAFETY: the mapping holds `rows` lines of RowPitch bytes, each at least `row` long.
            let read = unsafe {
                std::slice::from_raw_parts((mapped.pData as *const u8).add(line * mapped.RowPitch as usize), row)
            };
            out.copy_from_slice(read);
        }
        // SAFETY: pairs the successful Map above.
        unsafe { context.Unmap(&staging, 0) };
        // A frame that has not been drawn yet comes back all zero: nothing worth showing.
        bgra.iter().any(|&byte| byte != 0).then_some(Still { width, height, bgra })
    }
}

impl Drop for VideoPlayer {
    fn drop(&mut self) {
        // SAFETY: stops the engine's threads and releases the file before the window goes.
        let _ = unsafe { self.engine.Shutdown() };
    }
}
