
import RecyclePool from '../../3d/memop/recycle-pool';

class BaseRenderData {
    material = null;
    vertexCount = 0;
    indiceCount = 0;
};

export default class RenderData extends BaseRenderData {
    _data = [];
    _indices = [];
    _pivotX = 0;
    _pivotY = 0;
    _width = 0;
    _height = 0;
    uvDirty = true;
    vertDirty = true;

    get dataLength() {
        return this._data.length;
    }

    set dataLength(length) {
        let data = this._data;
        if (data.length !== length) {
            // // Free extra data
            let value = data.length;
            let i = 0;
            for (i = value; i < length; i++) {
                data[i] = _dataPool.add();
            }
            for (i = value; i > length; i--) {
                _dataPool.remove(i);
                data.splice(i, 1);
            }
        }
    }

    updateSizeNPivot(width, height, pivotX, pivotY) {
        if (width !== this._width ||
            height !== this._height ||
            pivotX !== this._pivotX ||
            pivotY !== this._pivotY) {
            this._width = width;
            this._height = height;
            this._pivotX = pivotX;
            this._pivotY = pivotY;
            this.vertDirty = true;
        }
    }

    // free(data) {
    //     if (data instanceof RenderData) {
    //         for (let i = data.length - 1; i > 0; i--) {
    //             data._data[i] = _dataPool.add();
    //         }
    //         data._data.length = 0;
    //         data._indices.length = 0;
    //         data.material = null;
    //         data.uvDirty = true;
    //         data.vertDirty = true;
    //         data.vertexCount = 0;
    //         data.indiceCount = 0;
    //         _pool.add(data);
    //     }
    // };

    clear() {
        this._data.length = 0;
        this._indices.length = 0;
        this._pivotX = 0;
        this._pivotY = 0;
        this._width = 0;
        this._height = 0;
        this.uvDirty = true;
        this.vertDirty = true;
        this.material = null;
        this.vertexCount = 0;
        this.indiceCount = 0;
    }

    static add() {
        let data = _pool.add();
        return {
            pooID: _pool.length - 1,
            data: data
        };
    }

    static remove(idx) {
        _pool.data[idx].clear();
        _pool.remove(idx);
    }
}

var _dataPool = new RecyclePool(function () {
    return {
        x: 0.0,
        y: 0.0,
        z: 0.0,
        u: 0.0,
        v: 0.0,
        color: 0
    };
}, 128);

var _pool = new RecyclePool(function () {
    return new RenderData();
}, 32);
