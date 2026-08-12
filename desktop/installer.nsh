; Assisted uninstalls explicitly choose whether user data is retained.
; Silent uninstalls retain data by default; electron-builder's documented
; --delete-app-data flag remains available to managed deployment tooling.
!macro customUnInstall
  ; Silent uninstalls keep data by default. Assisted uninstalls must ask.
  IfSilent cwbUninstallChoiceDone
  MessageBox MB_YESNO|MB_ICONQUESTION "是否同时删除本机数据和附件？$\r$\n选择“否”仅卸载程序并保留数据（推荐）。" /SD IDNO IDYES +2
  Goto cwbUninstallChoiceDone

  ; Electron uses the product name and package name in different release
  ; generations, so remove both known user-data locations only on consent.
  SetShellVarContext current
  RMDir /r "$APPDATA\Counselor Desk"
  RMDir /r "$APPDATA\counselor-desk"
  DetailPrint "已删除本机数据和附件。"
  cwbUninstallChoiceDone:
!macroend
