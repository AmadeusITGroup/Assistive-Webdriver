# Configuration file

This tool expects a configuration file describing how to create virtual machines for tests. The configuration file is supposed to be specified on the command line with the `--vm-config` option.

The configuration file can be in the `json` or the `js` format (any format that can be loaded by node.js through `require`). For example:

- In the JSON format:
```json
{
    "jaws": {
        "vmSettings": {
            "type": "virtualbox",
            "vm": "VMNameInVirtualBox",
            "snapshot": "SeleniumJaws"
        },
        "screenReader": true
    }
}
```

- In the JS format:
```js
module.exports = {
    jaws: {
        vmSettings: {
            type: "virtualbox",
            vm: "VMNameInVirtualBox",
            snapshot: "SeleniumJaws"
        },
        screenReader: true
    }
};
```

Each key in the configuration file (such as `jaws` in the previous example) allows to specify a different configuration. For example, it is possible to have different configurations for different screen readers or different operating system versions to test. The name of the configuration to be applied for a specific test is specified from the test file in the `awd:vm-config` capability.

## General settings

- `nativeEvents`, defaults to `true`: whether to enable native events. When this is `true`, the tool does not forward events to the selenium server running in the virtual machine, and instead uses the API of the virtual machine to send the events so that they appear as native in the virtual machine (coming from the virtual hardware).

- `screenReader`, defaults to `false`: whether to connect to the `tcp-web-listener` server in the virtual machine that reports what the screen reader says. If this is `false`, the screen-reader-related API (such as `webdriver.wait(forScreenReaderToSay(...))`) will not be available.

- `vmPortWebDriver`, defaults to `4444`: TCP port, inside the virtual machine, on which the standard standalone Selenium server is listening for connections.

- `vmHttpWebDriverPath`, defaults to `/wd/hub`: HTTP path to the webdriver API on the standard standalone Selenium server (running in the virtual machine on the port configured by the `vmPortWebDriver` setting).

- `vmPortScreenReader`, defaults to `7779`: TCP port, inside the virtual machine, on which the `tcp-web-listener` server in the virtual machine is listening for connections.

- `vmHttpScreenReaderPath`, defaults to `/live/websocket`: HTTP path to the websocket sending text from the screen reader on the `tcp-web-listener` server (running  in the virtual machine on the port configured by the `vmPortScreenReader` setting).

- `nativeEventsConfig`: Object defining the minimum delay to wait when executing native events. By default, the following values are used:
```json
{
  "pointerDownTime": 5,
  "pointerUpTime": 5,
  "pointerMoveTime": 5,
  "keyDownTime": 20,
  "keyUpTime": 100
}
```

## VM-provider specific settings

The `type` property in the `vmSettings` property allows to define which virtual machine provider to use.

### Virtualbox

When `type` is `virtualbox`, the following other options are available in `vmSettings`:

- `vm`: name or id of the virtual machine to clone
- `snapshot` (optional): name or id of the snapshot to use
- `server`, defaults to `http://127.0.0.1:18083`: specifies the address at which the `vboxwebsrv` command is exposing the virtualbox API. Note that connecting to a different machine is not currently supported (because of port redirections that are expected to be available on the local machine), so this option is mostly useful to change the port that `vboxwebsrv` is listening to.

### QEMU

When `type` is `qemu`, the following other option is available in `vmSettings`:

- `commandLine`: array of strings specifying the path to the executable and the arguments to use when running `qemu`. It is usually a good idea to include the `-snapshot` option. Note that this tool automatically adds the `-qmp stdio` option to communicate with qemu. It also automatically adds the `hostfwd` options, corresponding the the needed port redirections, to the first `-netdev` or `-nic` option (or automatically adds a `-nic user` option if none are found). Here is an example value for this parameter: `["qemu-system-x86_64", "--enable-kvm", "-machine", "q35", "-device", "intel-iommu", "-soundhw", "hda", "-m", "1024", "-device", "piix3-usb-uhci", "-device", "usb-tablet", "-nic", "user,model=e1000", "-only-migratable", "-display", "none", "/vm/disk.qcow2", "-incoming", "exec: gzip -c -d /vm/savedState.gz", "-snapshot"]`. This supposes that the machine state was saved to the `/vm/savedState.gz` file using the method described [here](https://www.linux-kvm.org/page/Migration#savevm.2Floadvm_to_an_external_state_file_.28using_pseudo-migration.29).
