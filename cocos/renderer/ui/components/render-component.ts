/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

import RenderableComponent from '../../../3d/framework/renderable-component';
// import gfx from '../../renderer/gfx/index';
import {
    ccclass,
    executeInEditMode,
    executionOrder,
    property,
    requireComponent,
} from '../../../core/data/class-decorator';
import macro from '../../../core/platform/CCMacro';
import { Color } from '../../../core/value-types/index';
import RenderData from '../render-data/renderData';
import UIRectComponent from './ui-rect-component';

/**
 * !#en
 * Base class for components which supports rendering features.
 * !#zh
 * 所有支持渲染的组件的基类
 *
 * @class RenderComponent
 * @extends Component
 */
@ccclass('cc.RenderComponent')
@requireComponent(UIRectComponent)
export default class RenderComponent extends RenderableComponent {

    /**
     * !#en specify the source Blend Factor, this will generate a custom material object
     * please pay attention to the memory cost.
     * !#zh 指定原图的混合模式，这会克隆一个新的材质对象，注意这带来的
     * @property srcBlendFactor
     * sprite.srcBlendFactor = macro.BlendFactor.ONE;
     */
    @property({
        type: macro.BlendFactor,
    })
    get srcBlendFactor () {
        return this._srcBlendFactor;
    }
    set srcBlendFactor (value) {
        if (this._srcBlendFactor === value) { return; }
        this._srcBlendFactor = value;
        this._updateBlendFunc(true);
    }

    /**
     * !#en specify the destination Blend Factor.
     * !#zh 指定目标的混合模式
     * @property dstBlendFactor
     * @type {macro.BlendFactor}
     * @example
     * sprite.dstBlendFactor = cc.macro.BlendFactor.ONE;
     */
    @property({
        type: macro.BlendFactor,
    })
    get dstBlendFactor () {
        return this._dstBlendFactor;
    }

    set dstBlendFactor (value) {
        if (this._dstBlendFactor === value) { return; }
        this._dstBlendFactor = value;
        this._updateBlendFunc(true);
    }

    get color () {
        return this._color;
    }

    set color (value) {
        if (this._color === value) {
            return;
        }

        this._color = value;
    }

    public static assembler = null;
    public _srcBlendFactor: number = macro.BlendFactor.SRC_ALPHA;
    public _dstBlendFactor: number = macro.BlendFactor.ONE_MINUS_SRC_ALPHA;
    @property
    public _color: Color = Color.WHITE;
    public _renderData: RenderData | null = null;
    // _allocedDatas = [];
    // _vertexFormat = null;
    // _toPostHandle = false;
    public _renderDataPoolID: number = -1;
    public _viewID: number = -1;

    constructor () {
        super();
        // this._assembler = this.constructor._assembler;
        // this._postAssembler = this.constructor._postAssembler;
    }

    public onEnable () {
        // if (this.node._renderComponent) {
        //     this.node._renderComponent.enabled = false;
        // }
        // this.node._renderComponent = this;
        // this.node._renderFlag |= RenderFlow.FLAG_RENDER | RenderFlow.FLAG_UPDATE_RENDER_DATA | RenderFlow.FLAG_COLOR;
    }

    public onDisable () {
        // this.node._renderComponent = null;
        // this.disableRender();
    }

    public onDestroy () {
        // for (let i = 0, l = this._allocedDatas.length; i < l; i++) {
        //     RenderData.free(this._allocedDatas[i]);
        // }
        // this._allocedDatas.length = 0;
        this.destroyRenderData();
        this.material = null;
        this._renderData = null;
    }

    // _canRender() {
    //     return this._enabled;
    // }

    // markForUpdateRenderData(enable) {
    //     // if (enable && this._canRender()) {
    //     //     this.node._renderFlag |= RenderFlow.FLAG_UPDATE_RENDER_DATA;
    //     // }
    //     // else if (!enable) {
    //     //     this.node._renderFlag &= ~RenderFlow.FLAG_UPDATE_RENDER_DATA;
    //     // }
    // }

    // markForRender(enable) {
    //     // if (enable && this._canRender()) {
    //     //     this.node._renderFlag |= RenderFlow.FLAG_RENDER;
    //     // }
    //     // else if (!enable) {
    //     //     this.node._renderFlag &= ~RenderFlow.FLAG_RENDER;
    //     // }
    // }

    // markForCustomIARender(enable) {
    //     // if (enable && this._canRender()) {
    //     //     this.node._renderFlag |= RenderFlow.FLAG_CUSTOM_IA_RENDER;
    //     // }
    //     // else if (!enable) {
    //     //     this.node._renderFlag &= ~RenderFlow.FLAG_CUSTOM_IA_RENDER;
    //     // }
    // }

    // disableRender() {
    //     // this.node._renderFlag &= ~(RenderFlow.FLAG_RENDER | RenderFlow.FLAG_CUSTOM_IA_RENDER | RenderFlow.FLAG_UPDATE_RENDER_DATA | RenderFlow.FLAG_COLOR);
    // }

    public requestRenderData () {
        const data = RenderData.add();
        // this._allocedDatas.push(data);
        this._renderData = data.data;
        this._renderDataPoolID = data.pooID;
        return this._renderData;
    }

    public destroyRenderData () {
        // let index = this._allocedDatas.indexOf(data);
        // if (index !== -1) {
        //     this._allocedDatas.splice(index, 1);
        //     RenderData.free(data);
        // }
        if (this._renderDataPoolID === -1) {
            return;
        }

        RenderData.remove(this._renderDataPoolID);
        this._renderDataPoolID = -1;
        this._renderData = null;
    }

    public _updateColor () {
        const material = this.material;
        if (material) {
            material.setProperty('color', this._color);
            // material.updateHash();
        }
    }

    //TODO:
    public _updateBlendFunc (updateHash) {
        // if (!this.material) {
        //     return;
        // }

        // var pass = this.material._mainTech.passes[0];
        // pass.setBlend(
        //     gfx.BLEND_FUNC_ADD,
        //     this._srcBlendFactor, this._dstBlendFactor,
        //     gfx.BLEND_FUNC_ADD,
        //     this._srcBlendFactor, this._dstBlendFactor
        // );

        // if (updateHash) {
        //     this.material.updateHash();
        // }
    }
}

// RenderComponent._assembler = null;
// RenderComponent._postAssembler = null;
