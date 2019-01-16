import gfx from '../gfx/index';
import VertexFormat from '../gfx/vertex-format';
import { UI } from './ui';
// import UISystem from '../UISystem';

export class MeshBuffer {
    public byteStart: number = 0;
    public byteOffset: number = 0;
    public indiceStart: number = 0;
    public indiceOffset: number = 0;
    public vertexStart: number = 0;
    public vertexOffset: number = 0;
    public _vertexBytes: number = 0;
    public _vb: gfx.VertexBuffer | null = null;
    public _ib: gfx.VertexBuffer | null = null;
    public _vData: Float32Array|null = null;
    public _iData: Uint16Array|null = null;
    public _uintVData: Uint32Array|null = null;

    private _vertexFormat: VertexFormat | null = null;
    private _renderer: UI|null = null;

    private _initVDataCount: number = 0; // actually 256 * 4 * (vertexFormat._bytes / 4)
    private _initIDataCount: number = 256 * 6;
    private _dirty: boolean = false;

    constructor (renderer: UI, vertexFormat: VertexFormat) {

        const device = cc.game._renderContext;
        this._vertexFormat = vertexFormat;
        this._vertexBytes = this._vertexFormat._bytes;
        this._vb = new gfx.VertexBuffer(
            device,
            vertexFormat,
            gfx.USAGE_DYNAMIC,
            new ArrayBuffer(0),
            0,
        );
        this._ib = new gfx.IndexBuffer(
            device,
            gfx.INDEX_FMT_UINT16,
            gfx.USAGE_STATIC,
            new ArrayBuffer(0),
            0,
        );
        this._renderer = renderer;
        this._initVDataCount = 256 * vertexFormat._bytes;
        this._reallocBuffer();
    }

    public uploadData () {
        if (this.byteOffset === 0 || !this._dirty) {
            return;
        }

        // update vertext data
        const vertexsData = new Float32Array(this._vData!.buffer, 0, this.byteOffset >> 2);
        const indicesData = new Uint16Array(this._iData!.buffer, 0, this.indiceOffset);

        const vb = this._vb;
        vb.update(0, vertexsData);

        const ib = this._ib;
        ib.update(0, indicesData);

        this._dirty = false;
    }

    public requestStatic (vertexCount, indiceCount) {
        const byteOffset = this.byteOffset + vertexCount * this._vertexBytes;
        const indiceOffset = this.indiceOffset + indiceCount;

        let byteLength = this._vData!.byteLength;
        let indiceLength = this._iData!.length;
        if (byteOffset > byteLength || indiceOffset > indiceLength) {
            while (byteLength < byteOffset || indiceLength < indiceOffset) {
                this._initVDataCount *= 2;
                this._initIDataCount *= 2;

                byteLength = this._initVDataCount * 4;
                indiceLength = this._initIDataCount;
            }

            this._reallocBuffer();
        }

        this.vertexOffset += vertexCount;
        this.indiceOffset += indiceCount;

        this.byteOffset = byteOffset;

        this._dirty = true;
    }

    public request (vertexCount, indiceCount) {
        if (this._renderer!.buffer !== this) {
            this._renderer!.flush();
            this._renderer!.buffer = this;
        }

        this.requestStatic(vertexCount, indiceCount);
    }

    public _reallocBuffer () {
        this._reallocVData(true);
        this._reallocIData(true);
    }

    public _reallocVData (copyOldData) {
        let oldVData;
        if (this._vData) {
            oldVData = new Uint8Array(this._vData.buffer);
        }

        this._vData = new Float32Array(this._initVDataCount);
        this._uintVData = new Uint32Array(this._vData.buffer);
        const newData = new Uint8Array(this._uintVData.buffer);

        if (oldVData && copyOldData) {
            for (let i = 0, l = oldVData.length; i < l; i++) {
                newData[i] = oldVData[i];
            }
        }

        this._vb._bytes = this._vData.byteLength;
    }

    public _reallocIData (copyOldData) {
        const oldIData = this._iData;

        this._iData = new Uint16Array(this._initIDataCount);

        if (oldIData && copyOldData) {
            const iData = this._iData;
            for (let i = 0, l = oldIData.length; i < l; i++) {
                iData[i] = oldIData[i];
            }
        }

        this._ib._bytes = this._iData.byteLength;
    }

    public reset () {
        this.byteStart = 0;
        this.byteOffset = 0;
        this.indiceStart = 0;
        this.indiceOffset = 0;
        this.vertexStart = 0;
        this.vertexOffset = 0;
        this._dirty = false;
    }

    public destroy () {
        this._ib.destroy();
        this._vb.destroy();
    }
}

cc.MeshBuffer = MeshBuffer;
