export class QemuLaunchException {
  message: string;
  constructor(readonly error: string) {
    this.message = `Can't launch qemu ${this.error}`;
  }
}
