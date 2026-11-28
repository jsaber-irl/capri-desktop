### Translation System, Testing & Coverage
- Added comprehensive translation tests covering HTML, Markdown, RTF, PDF, and other document formats.
- Extended chat tests to cover translation requests for files and web pages.
- Added batch translation tests to verify segment ordering and progress reporting.
- Updated existing tests to reflect changes in translation request handling and validate additional translation scenarios.

### macOS Permissions & Browser Automation
- Enhanced macOS permissions tests to cover browser automation, target verification, and authorized browser handling.
- Extended permission tests to validate new automation targets and ensure proper request handling.
- Added configuration tests to verify the default value of `macAutomationGranted`.
- Improved browser target and permission handling in the macOS environment.

### Document Translation & Previews
- Added tests to ensure local documents are translated into self-contained previews without modifying the original files.
- Improved validation of HTML, Markdown, and document translation workflows.