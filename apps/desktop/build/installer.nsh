; Umbra custom NSIS installer script

; On uninstall: remove app data (settings, history snapshots).
; User documents (rootPath configured by user) are stored separately and are NOT touched.
!macro customUnInstall
  RMDir /r "$APPDATA\Umbra"
!macroend
