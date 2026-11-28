$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

try {
  Add-Type -ReferencedAssemblies UIAutomationClient, UIAutomationTypes -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Automation;

public static class CapriActivePage {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int count);

  public static IntPtr Foreground() {
    return GetForegroundWindow();
  }

  public static string ProcessName(IntPtr hwnd) {
    uint pid;
    GetWindowThreadProcessId(hwnd, out pid);
    try { return Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant(); } catch { return ""; }
  }

  public static string WindowTitle(IntPtr hwnd) {
    StringBuilder buffer = new StringBuilder(512);
    GetWindowText(hwnd, buffer, buffer.Capacity);
    return buffer.ToString();
  }

  // The address bar is the only Edit/ComboBox whose automation id or name says
  // address/url/omnibox. Its ValuePattern is read, never typed into.
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
      if (Uri.TryCreate(value, UriKind.Absolute, out uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)) {
        return uri.AbsoluteUri;
      }
    }
    return "";
  }
}
"@

  $supported = @{ 'chrome' = 'chrome'; 'brave' = 'brave'; 'msedge' = 'msedge'; 'vivaldi' = 'vivaldi'; 'opera' = 'opera'; 'firefox' = 'firefox' }
  $hwnd = [CapriActivePage]::Foreground()
  if ($hwnd -eq [IntPtr]::Zero) {
    @{ status = 'no-window'; reason = 'No foreground window.' } | ConvertTo-Json -Compress
    exit 0
  }
  $process = [CapriActivePage]::ProcessName($hwnd)
  if (-not $supported.ContainsKey($process)) {
    @{ status = 'unsupported'; reason = "Foreground application is $process." } | ConvertTo-Json -Compress
    exit 0
  }
  $url = [CapriActivePage]::ReadUrl($hwnd)
  $title = [CapriActivePage]::WindowTitle($hwnd)
  if ([string]::IsNullOrWhiteSpace($url)) {
    @{ status = 'unavailable'; browser = $supported[$process]; title = $title; permission = $true } | ConvertTo-Json -Compress
    exit 0
  }
  @{ status = 'ok'; browser = $supported[$process]; url = $url; title = $title } | ConvertTo-Json -Compress
} catch {
  $message = $_.Exception.Message
  @{ status = 'error'; reason = $message; permission = ($message -match 'access denied|permission|UI Automation|Automation') } | ConvertTo-Json -Compress
}
