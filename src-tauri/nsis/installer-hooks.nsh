; NSIS installer hooks, wired in through bundle.windows.nsis.installerHooks.

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "${UNINSTKEY}" "Publisher" "condalabs"
!macroend

; Updater passive install (/P, $UpdateMode == 1) never touches app data.
!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode = 1
    StrCpy $DeleteAppDataCheckboxState 0
  ${EndIf}
!macroend
