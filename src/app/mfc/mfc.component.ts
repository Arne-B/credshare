import { NgClass } from '@angular/common';
import { Component, computed, inject, Signal, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip'
import { MfcJson } from './MfcJson';
import { AcBits } from './AcBits';


@Component({
  selector: 'app-mfc',
  imports: [NgClass, QRCodeComponent, MatButtonModule, MatIcon, MatTooltipModule],
  templateUrl: './mfc.component.html',
  styleUrl: './mfc.component.css'
})
export class MfcComponent {

  public data = signal<number[]>([]);
  public blocks: Signal<number[][]> = computed(() => this.arrayChunks(this.data(), 16));
  public sectors: Signal<number[][][]> = computed(() => this.arrayChunks(this.blocks(), 4));

  public accessConditions: Signal<number[][]> = computed(() => this.sectors().map(s => s.slice(-1)[0]).map(b => b.slice(6, 10)));
  public accessConditionsDescription: Signal<string[][]> = computed(() => this.accessConditions().map((a) => [...AcBits.createAll(a).map(b => b.description())]));

  public uid: Signal<string> = computed(() => this.data().length > 4 ? this.data().slice(0, 4).map(b => b.toString(16)).join(' ').toUpperCase() : '');
  public bcc: Signal<string> = computed(() => this.data().length > 5 ? this.data()[4].toString(16).toUpperCase().padStart(2, '0') : '');
  public sak: Signal<string> = computed(() => this.data().length > 6 ? this.data()[5].toString(16).toUpperCase().padStart(2, '0') : '');
  public atqa: Signal<string> = computed(() => this.data().length > 7 ? this.data()[6].toString(16).toUpperCase().padStart(2, '0') : '');

  public base64 = signal<string>('');
  public url: Signal<string> = computed(() => location.origin + '/mfc#' + this.base64());


  private _snackBar = inject(MatSnackBar);

  constructor(private route: ActivatedRoute, private router: Router) {

    this.route.fragment.subscribe(fragment => {
      if (fragment) {
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

  private hexStringToByteArray(str: string) {
    const data: number[] = [];
    for (let i = 0, len = str.length; i < len; i += 2) {
      data.push(parseInt(str.slice(i, i + 2), 16));
    }
    return data;
  }


  // Byte styling helper

  public isUidByte(sector: number, block: number, byte: number): boolean {

    if (sector != 0) {
      return false;
    }

    if (block != 0) {
      return false;
    }

    if (byte < 0 || byte >= 4) {
      return false;
    }

    return true;
  }

  public isKeyAByte(sector: number, block: number, byte: number): boolean {

    if ((block + 1) % 4 != 0) {
      return false;
    }

    if (byte < 0 || byte >= 6) {
      return false;
    }

    return true;
  }

  public isAcByte(sector: number, block: number, byte: number): boolean {

    if ((block + 1) % 4 != 0) {
      return false;
    }

    if (byte < 6 || byte >= 9) {
      return false;
    }

    return true;
  }

  public isKeyBByte(sector: number, block: number, byte: number): boolean {

    if ((block + 1) % 4 != 0) {
      return false;
    }

    if (byte < 10 || byte >= 16) {
      return false;
    }

    return true;
  }

  // File actions

  async loadDump(event: any) {
    const file: File = event.target.files[0];

    // load BIN
    if (file && file.size % 1024 == 0 && file.name.toLowerCase().endsWith('.bin')) {
      this.router.navigate(['/mfc'], { fragment: await MfcComponent.compressBase64(new Blob([await file.arrayBuffer()])) });
      return;
    }

    // load JSON
    if (file && file.name.toLowerCase().endsWith('.json')) {
      const text = await new Blob([await file.arrayBuffer()]).text();
      const json: MfcJson = Object.assign(new MfcJson(), JSON.parse(text));

      if(!json || !json.blocks) {
        this._snackBar.open('Could not load Json...', 'OK');
        return;
      }

      const blockCount = Object.keys(json.blocks).length;
      const data: number[] = [];

      for(let i = 0; i < blockCount; i++) {
        const bytes = this.hexStringToByteArray(json.blocks[i.toString()]);
        data.push(...bytes);
      }

      if(data.length % 1024 != 0) {
        this._snackBar.open('Data length does not match...', 'OK');
      }

      this.router.navigate(['/mfc'], { fragment: await MfcComponent.compressBase64(new Blob([new Uint8Array(data).buffer], { type: 'application/octet-stream' })) });
      return;
    }

    //TODO: load NFC
    if (file && file.name.toLowerCase().endsWith('.nfc')) {
      this._snackBar.open('F0 NFC format not yet supported...', 'OK');
      return;
    }

    this._snackBar.open('Sorry, something is wrong...', 'OK');
  }

  downloadBin() {
    const blob = new Blob([new Uint8Array(this.data()).buffer], { type: 'application/octet-stream' });
    const fileURL = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = fileURL;
    downloadLink.download = 'hf-mf-' + this.uid().split(' ').join('') + '-dump.bin';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    URL.revokeObjectURL(fileURL);
  }

  downloadJson() {
    let json = new MfcJson();

    json.Card = { UID: this.uid(), ATQA: this.atqa(), SAK: this.sak() };

    json.blocks = {};
    let strBlocks = this.blocks().map( b => b.map(s => s.toString(16).padStart(2, '0')).join('').toUpperCase());

    for(let i = 0; i < strBlocks.length; i++) {
      json.blocks[i.toString()] = strBlocks[i];
    }

    json.SectorKeys = {};
    let secKeys = this.sectors().map( s => s[s.length - 1]);

    for(let i = 0; i < secKeys.length; i++) {

      json.SectorKeys[i.toString()] = {
        KeyA: [...secKeys[i]].splice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
        KeyB: [...secKeys[i]].splice(10, 6).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
        AccessConditions: [...secKeys[i]].splice(6, 4).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
        AccessConditionsText: {
          ['block' + (0 + i * 4).toString()] : this.accessConditionsDescription()[i][0],
          ['block' + (1 + i * 4).toString()]: this.accessConditionsDescription()[i][1],
          ['block' + (2 + i * 4).toString()]: this.accessConditionsDescription()[i][2],
          ['block' + (3 + i * 4).toString()]: this.accessConditionsDescription()[i][3],
          UserData: [...secKeys[i]].splice(9, 1).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
        }
      };
    }

    console.log(json);

    const blob = new Blob([JSON.stringify(json, null, 4)], { type: 'text/json' });
    const fileURL = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = fileURL;
    downloadLink.download = 'hf-mf-' + this.uid().split(' ').join('') + '-dump.json';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    URL.revokeObjectURL(fileURL);
  }
}
