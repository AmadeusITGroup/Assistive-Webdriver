# TextToSocketEngine

This directory contains an implementation of the Windows <abbr title="Speech API">SAPI</abbr> <abbr title="Text-To-Speech">TTS</abbr> engine interface ([`ISpTTSEngine`](https://docs.microsoft.com/en-us/previous-versions/windows/desktop/ms719558(v%3dvs.85))) that simply redirects all the text it receives to a configured TCP socket, instead of converting the text to speech (as regular TTS engines do).

It is based on [the TTS engine example provided by Microsoft](https://github.com/Microsoft/Windows-classic-samples/tree/master/Samples/Win7Samples/winui/speech/engines/samplettsengine/samplettsengine).

It is especially useful to test software that can read text through the Windows Speech API. Some screen readers (such as [JAWS](https://www.freedomscientific.com/products/software/jaws/)) can be configured to use it, so the "text to socket" engine provided in this directory can be used in automatic tests to check that some software or website works as expected with those screen readers.

Especially, it was done with the purpose of being used with [assistive-webdriver](../assistive-webdriver) to automate end-to-end tests with a screen reader.

## How to build

The build requires Microsoft Visual C++ command line compiler and tools (`cl`, `midl`, `rc` and `cvtres`).

Execute the [`build.cmd`](./build.cmd) script from a command prompt with the correct build variables configured. The `TextToSocketEngine.dll` file will be created.

## How to install

Execute the [`register.cmd`](./register.cmd) script from a command prompt with administrator privileges. This first registers the engine and then creates a voice that uses it.
The voice has the `textToSocketVoice` id, is displayed in configuration dialogs as `Text To Socket localhost:4449` and is configured to redirect all text to `localhost` on TCP port `4449`.
To change the settings, just edit the script before running it.
It is possible to register different voices with different settings (different hosts and TCP ports) that all use the same "text to socket" engine.

## How to uninstall

Execute the [`unregister.cmd`](./unregister.cmd) script from a command prompt with administrator privileges. It first removes the voice with the `textToSocketVoice` id then unregisters the engine.
