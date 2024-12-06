import { NgClass } from '@angular/common';
import { Component, computed, Signal, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import {MatButtonModule} from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-mfc',
  imports: [NgClass, QRCodeComponent, MatButtonModule, MatIcon],
  templateUrl: './mfc.component.html',
  styleUrl: './mfc.component.css'
})
export class MfcComponent {
  async loadDump(event:any) {
  const file:File = event.target.files[0];

  if (file && file.size % 1024 == 0) {

      console.log(file.name);
      console.log(file.size);

      this.data.set(Array.from(new Uint8Array(await file.arrayBuffer())));
      this.base64.set(await MfcComponent.compressBase64(new Blob([await file.arrayBuffer()])));
      this.router.navigate(['/mfc'], {fragment: this.base64()});
  }
}

  public data = signal<number[]>([]);
  public blocks: Signal<number[][]> = computed(() => this.arrayChunks(this.data(), 16));
  public sectors: Signal<number[][][]> = computed(() => this.arrayChunks(this.blocks(), 4));

  public uid: Signal<string> = computed(() => this.data().length > 4 ? this.data().slice(0, 3).map(b => b.toString(16)).join(' ').toUpperCase() : '');
  public bcc: Signal<string> = computed(() => this.data().length > 5 ? this.data()[4].toString(16).toUpperCase() : '');
  public sak: Signal<string> = computed(() => this.data().length > 6 ? this.data()[5].toString(16).toUpperCase() : '');
  public atqa: Signal<string> = computed(() => this.data().length > 7 ? this.data()[6].toString(16).toUpperCase() : '');

  public base64 = signal<string>('');
  public url: Signal<string> = computed(() => location.origin + '#' + this.base64());

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.fragment.subscribe(fragment => {
      console.log('Fragment:', fragment);
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
    const numberOfChunks = Math.ceil(array.length / chunkSize)

    return [...Array(numberOfChunks)]
      .map((_, index) => {
        return array.slice(index * chunkSize, (index + 1) * chunkSize)
      })
  }

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

}
