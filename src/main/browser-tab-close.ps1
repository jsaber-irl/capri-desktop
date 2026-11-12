param([string]$Browser = '', [string]$Url = '')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

try {
  Add-Type -ReferencedAssemblies UIAutomationClient, UIAutomationTypes -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Automation;

public static class CapriBrowserTab {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true)] static extern bool IsWindow(IntPtr hwnd);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll")] static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);

  public static string ReadUrl(IntPtr hwnd) {
    AutomationElement root = AutomationElement.FromHandle(hwnd);
    if (root == null) return "";
    var fields = root.FindAll(TreeScope.Descendants, new OrCondition(
      new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit),
      new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ComboBox)));
    foreach (AutomationElement field in fields) {
      string id = field.Current.AutomationId ?? "";
      string name = field.Current.Name ?? "";
      if (!Regex.IsMatch(id + " " + name, @"address|urlbar|omnibox|location", RegexOptions.IgnoreCase)) continue;
      object pattern;
      if (!field.TryGetCurrentPattern(ValuePattern.Pattern, out pattern)) continue;
      string value = ((ValuePattern)pattern).Current.Value;
      Uri uri;
      if (Uri.TryCreate(value, UriKind.Absolute, out uri)) return uri.AbsoluteUri;
    }
    return "";
  }

  public static int ReadTabCount(IntPtr hwnd) {
    AutomationElement root = AutomationElement.FromHandle(hwnd);
    if (root == null) return 0;
    return root.FindAll(TreeScope.Descendants,
      new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TabItem)).Count;
  }

  public static string Close(string expectedProcess, string expectedUrl) {
    IntPtr hwnd = GetForegroundWindow();
    if (hwnd == IntPtr.Zero) return "no-window";
    uint pid;
    GetWindowThreadProcessId(hwnd, out pid);
    string process = "";
    try { process = Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant(); } catch { return "wrong-browser"; }
    if (process != expectedProcess) return "wrong-browser";
    string before = ReadUrl(hwnd);
    if (before == "") return "permission";
    if (!String.Equals(before, expectedUrl, StringComparison.OrdinalIgnoreCase)) return "target-mismatch";
    int beforeTabCount = ReadTabCount(hwnd);
    foreach (int key in new int[] { 0x10, 0x11, 0x12, 0x5B, 0x5C })
      if ((GetAsyncKeyState(key) & 0x8000) != 0) return "keys-held";

    // UI Automation identified the foreground browser and its exact active URL. Ctrl+W is
    // sent only after these checks, then the same foreground window is inspected again.
    keybd_event(0x11, 0, 0, UIntPtr.Zero);
    keybd_event(0x57, 0, 0, UIntPtr.Zero);
    keybd_event(0x57, 0, 2, UIntPtr.Zero);
    keybd_event(0x11, 0, 2, UIntPtr.Zero);
    for (int i = 0; i < 8; i++) {
      Thread.Sleep(100);
      if (!IsWindow(hwnd)) return "closed";
      if (GetForegroundWindow() != hwnd) return "not-verified";
      if (beforeTabCount > 0 && ReadTabCount(hwnd) < beforeTabCount) return "closed";
      string after = ReadUrl(hwnd);
      // A URL change alone could be a navigation, so it is never treated as proof of closure.
      if (after == "") return "not-verified";
    }
    return "not-verified";
  }
}
"@
  if ($Browser -notin @('chrome', 'msedge', 'firefox')) { throw 'Unsupported browser.' }
  $result = [CapriBrowserTab]::Close($Browser, $Url)
  @{ status = $result } | ConvertTo-Json -Compress
} catch {
  $message = $_.Exception.Message
  @{ status = 'error'; permission = ($message -match 'access denied|permission|UI Automation|Automation') } | ConvertTo-Json -Compress
}
