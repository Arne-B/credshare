import { NgClass } from '@angular/common';
import { Component, computed, inject, Signal, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import {MatButtonModule} from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mfc',
  imports: [NgClass, QRCodeComponent, MatButtonModule, MatIcon],
  templateUrl: './mfc.component.html',
  styleUrl: './mfc.component.css'
})
export class MfcComponent {

  public data = signal<number[]>([]);
  public blocks: Signal<number[][]> = computed(() => this.arrayChunks(this.data(), 16));
  public sectors: Signal<number[][][]> = computed(() => this.arrayChunks(this.blocks(), 4));

  public uid: Signal<string> = computed(() => this.data().length > 4 ? this.data().slice(0, 4).map(b => b.toString(16)).join(' ').toUpperCase() : '');
  public bcc: Signal<string> = computed(() => this.data().length > 5 ? this.data()[4].toString(16).toUpperCase() : '');
  public sak: Signal<string> = computed(() => this.data().length > 6 ? this.data()[5].toString(16).toUpperCase() : '');
  public atqa: Signal<string> = computed(() => this.data().length > 7 ? this.data()[6].toString(16).toUpperCase() : '');

  public base64 = signal<string>('');
  public url: Signal<string> = computed(() => location.origin + '/mfc#' + this.base64());

  private _snackBar = inject(MatSnackBar);

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.fragment.subscribe(fragment => {
      if(fragment) {
        var dataUrl = "data:application/octet-binary;base64," + fragment;
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => blob.stream())
          .then(async stream => {
            return await new Response(stream.pipeThrough(new DecompressionStream("gzip"))).blob();
          })
          .then(async blob => {
            this.data.set(Array.from(new Uint8Array(await blob.arrayBuffer())));
            this.base64.set(await MfcComponent.compressBase64(blob));
          });
      }
    });
  }

  private static async compressBase64(blob: Blob): Promise<string> {
    const compressedReadableStream = blob.stream().pipeThrough(
      new CompressionStream("gzip")
    );
    const compressedResponse = new Response(compressedReadableStream);

    const smallBlob = await compressedResponse.blob();
    const buffer = await smallBlob.arrayBuffer();
    const compressedBase64 = btoa(
      String.fromCharCode(
        ...new Uint8Array(buffer)
      )
    );

    return compressedBase64;
  }

  private arrayChunks<T>(array: T[], chunkSize: number) {
    const numberOfChunks = Math.ceil(array.length / chunkSize);
    return [...Array(numberOfChunks)].map((_, index) => array.slice(index * chunkSize, (index + 1) * chunkSize));
  }


  // Byte styling helper

  public isUidByte(sector: number, block: number, byte: number): boolean {

    if(sector != 0) {
      return false;
    }

    if(block != 0) {
      return false;
    }

    if(byte < 0 || byte >= 4) {
      return false;
    }

    return true;
  }

  public isKeyAByte(sector: number, block: number, byte: number): boolean {

    if((block + 1) % 4 != 0) {
      return false;
    }

    if(byte < 0 || byte >= 6) {
      return false;
    }

    return true;
  }

  public isAcByte(sector: number, block: number, byte: number): boolean {

    if((block + 1) % 4 != 0) {
      return false;
    }

    if(byte < 6 || byte >= 9) {
      return false;
    }

    return true;
  }

  public isKeyBByte(sector: number, block: number, byte: number): boolean {

    if((block + 1) % 4 != 0) {
      return false;
    }

    if(byte < 10 || byte >= 16) {
      return false;
    }

    return true;
  }

  // File actions

  async loadDump(event:any) {
    const file:File = event.target.files[0];

    if (file && file.size % 1024 == 0 && file.name.toLowerCase().endsWith('.bin')) {
        this.router.navigate(['/mfc'], {fragment: await MfcComponent.compressBase64(new Blob([await file.arrayBuffer()]))});
        return;
    }

    if(file && file.name.toLowerCase().endsWith('.json')) {
      this._snackBar.open('Json format not yet supported...', 'OK');
      return;
    }

    if(file && file.name.toLowerCase().endsWith('.nfc')) {
      this._snackBar.open('F0 NFC format not yet supported...', 'OK');
      return;
    }

    this._snackBar.open('Sorry, something is wrong...', 'OK');
  }

  downloadBin() {
    const blob = new Blob([new Uint8Array(this.data()).buffer], {type: 'application/octet-stream'});
    const fileURL = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = fileURL;
    downloadLink.download = this.uid().split(' ').join('') + '-dump.bin';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    URL.revokeObjectURL(fileURL);
  }
}
