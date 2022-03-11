# Kymano

Kymano is a platform for delivering virtual machines. Kymano uses yml-configs to describe VMs. It works on MacOS, Linux, Windows.

## Stability
Kymano is very young project and can be very unstable, but we work hard to improve it.

## Commands

### Import data from Parallels / VirtualBox / VMware / Hyper-v
#### 1. Convert disk to the qcow2 format
```sh
npx kymano convert /path_to_the_vm_disk
```
<a href="docs/MacOS_shared_directory.md">Howto find the Parallels / VirtualBox / VMware / Hyper-v disk</a>
#### 2. Add converted disk as an additional drive:
```sh
npx kymano run fedora --drive /path_to_the_vm_disk.qcow2
```
Instead of 'fedora' you can specify needed operation system.

or you can just inspect the imported drive content:
```sh
npx kymano inspect 95039522f9b8f06c06cd9f43dbdb9ec627e50a48217212e56f0e8ed43fa4434a
```

### Run the fedora VM

```sh
npx kymano run fedora
```

Full list avaliable alises can be found [https://github.com/kymano-app/repo/blob/master/cli_aliases.yml](here)

### Run VM from a github repo

```sh
npx kymano run kymano-app/fedora/fedora35-workstation
```

Will download https://raw.githubusercontent.com/kymano-app/fedora/master/fedora35-workstation-arm64/0.1.yml or https://raw.githubusercontent.com/kymano-app/fedora/master/fedora35-workstation-x86_64/0.1.yml

### Run VM from an url

```sh
npx kymano run http://kymano.app/fedora35-workstation
```

### Run VM from local config

```sh
npx kymano run ./path_to_the_config
```

### Run with different arch

```sh
npx kymano run fedora --platform arm64
```

### List VM

```sh
npx kymano ps
```

### Export VM

```sh
npx kymano export fedora-1
```

Will be created fedora-1.tgz

### Import exported VM

```sh
npx kymano import fedora-1.tgz
```

### Shared directory
```sh
npx kymano run fedora -v /path_to_the_directory:/path_in_the_VM
```
<a href="docs/MacOS_shared_directory.md">Instruction for Mac-hosts</a>

### Remove VM disk
```sh
npx kymano rm vm_name/drive_name
```

## For VM creators

This commands you will need if you decide to create your images.

### Commit your layer
```sh
npx kymano commit vm_name/drive_name
```


