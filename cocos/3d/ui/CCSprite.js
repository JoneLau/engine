/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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
// @ts-check
// const misc = require('../utils/misc');
// const NodeEvent = require('../CCNode').EventType;
// const RenderComponent = require('./CCRenderComponent');
// const RenderFlow = require('../renderer/render-flow');
// const renderEngine = require('../renderer/render-engine');
// const SpriteMaterial = renderEngine.SpriteMaterial;
// const GraySpriteMaterial = renderEngine.GraySpriteMaterial;
import misc from '../../core/utils/misc';
import RenderComponent from '../../3d/framework/renderable-component';
import { vec2, vec3, mat4, color4 } from '../../core/vmath/index';
import { ccclass, property, menu, executionOrder, executeInEditMode } from '../../core/data/class-decorator';
import SpriteFrame from '../../assets/CCSpriteFrame';
import Texture2D from '../../assets/texture-2d';
import RenderData from './renderData';
import Assembler from './assembler/sprite/index';

/**
 * !#en Enum for sprite type.
 * !#zh Sprite 类型
 * @enum Sprite.Type
 */
var SpriteType = cc.Enum({
    /**
     * !#en The simple type.
     * !#zh 普通类型
     * @property {Number} SIMPLE
     */
    SIMPLE: 0,
    /**
     * !#en The sliced type.
     * !#zh 切片（九宫格）类型
     * @property {Number} SLICED
     */
    SLICED: 1,
    /**
     * !#en The tiled type.
     * !#zh 平铺类型
     * @property {Number} TILED
     */
    TILED: 2,
    /**
     * !#en The filled type.
     * !#zh 填充类型
     * @property {Number} FILLED
     */
    FILLED: 3,
    /**
     * !#en The mesh type.
     * !#zh 以 Mesh 三角形组成的类型
     * @property {Number} MESH
     */
    MESH: 4
});

/**
 * !#en Enum for fill type.
 * !#zh 填充类型
 * @enum Sprite.FillType
 */
var FillType = cc.Enum({
    /**
     * !#en The horizontal fill.
     * !#zh 水平方向填充
     * @property {Number} HORIZONTAL
     */
    HORIZONTAL: 0,
    /**
     * !#en The vertical fill.
     * !#zh 垂直方向填充
     * @property {Number} VERTICAL
     */
    VERTICAL: 1,
    /**
     * !#en The radial fill.
     * !#zh 径向填充
     * @property {Number} RADIAL
     */
    RADIAL: 2,
});

/**
 * !#en Sprite Size can track trimmed size, raw size or none.
 * !#zh 精灵尺寸调整模式
 * @enum Sprite.SizeMode
 */
var SizeMode = cc.Enum({
    /**
     * !#en Use the customized node size.
     * !#zh 使用节点预设的尺寸
     * @property {Number} CUSTOM
     */
    CUSTOM: 0,
    /**
     * !#en Match the trimmed size of the sprite frame automatically.
     * !#zh 自动适配为精灵裁剪后的尺寸
     * @property {Number} TRIMMED
     */
    TRIMMED: 1,
    /**
     * !#en Match the raw size of the sprite frame automatically.
     * !#zh 自动适配为精灵原图尺寸
     * @property {Number} RAW
     */
    RAW: 2
});

var State = cc.Enum({
    /**
     * !#en The normal state
     * !#zh 正常状态
     * @property {Number} NORMAL
     */
    NORMAL: 0,
    /**
     * !#en The gray state, all color will be modified to grayscale value.
     * !#zh 灰色状态，所有颜色会被转换成灰度值
     * @property {Number} GRAY
     */
    GRAY: 1
});
var _tmpMatrix = mat4.create();

@ccclass('cc.SpriteComponent')
@executionOrder(100)
@menu('UI/Sprite')
@executeInEditMode
export default class SpriteComponent extends RenderComponent {
    @property
    _spriteFrame = null;
    @property
    _type = SpriteType.SIMPLE;
    @property
    _fillType = FillType.HORIZONTAL;
    @property
    _sizeMode = SizeMode.TRIMMED;
    @property
    _fillCenter = cc.v2(0, 0);
    @property
    _fillStart = 0;
    @property
    _fillRange = 0;
    @property
    _isTrimmedMode = true;
    _state = 0;
    @property
    _atlas = null;
    @property
    _color = cc.color(255, 255, 255, 255);
    @property
    _texture = null;
    _renderData = null;
    _renderDataPoolID = -1;
    _assembler = null;
    @property
    _size = cc.size(100, 100);
    @property
    _anchor = cc.v2(0.5, 0.5);
    @property
    get size() {
        return this._size;
    }

    set size(value) {
        this._size = value;
    }

    @property
    get anchor() {
        return this._anchor;
    }

    set anchor(value) {
        this._anchor = value;
    }
    @property({
        type: Texture2D
    })
    get texture() {
        return this._texture;
    }

    set texture(value) {
        this._texture = value;
        if (this._spriteFrame) {
            this.material.setProperty('mainTexture', this._texture);
            this._initSpriteFrame();
        }
    }
    // editorOnly = true;
    // visible = true;
    // animatable = false;

    /**
         * !#en The sprite frame of the sprite.
         * !#zh 精灵的精灵帧
         * @property spriteFrame
         * @type {SpriteFrame}
         * @example
         * sprite.spriteFrame = newSpriteFrame;
         */
    @property({
        type: SpriteFrame
    })
    get spriteFrame() {
        return this._spriteFrame;
    }

    set spriteFrame(value) {
        if (this._spriteFrame === value) {
            return;
        }

        let lastSprite = this._spriteFrame;
        this._spriteFrame = value;
        // render & update render data flag will be triggered while applying new sprite frame
        this.markForUpdateRenderData(false);
        this._applySpriteFrame(lastSprite);
        if (CC_EDITOR) {
            this.node.emit('spriteframe-changed', this);
        }
    }

    /**
     * !#en The sprite render type.
     * !#zh 精灵渲染类型
     * @property type
     * @type {Sprite.Type}
     * @example
     * sprite.type = cc.Sprite.Type.SIMPLE;
     */
    @property({
        type: SpriteType
    })
    get type() {
        return this._type;
    }
    set type(value) {
        if (this._type !== value) {
            // this.destroyRenderData(/*this._renderData*/);
            // this._renderData = null;
            this._type = value;
            this._updateAssembler();
        }
    }

    /**
     * !#en
     * The fill type, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
     * !#zh
     * 精灵填充类型，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
     * @property fillType
     * @type {Sprite.FillType}
     * @example
     * sprite.fillType = cc.Sprite.FillType.HORIZONTAL;
     */
    @property({
        type: FillType
    })
    get fillType() {
        return this._fillType;
    }
    set fillType(value) {
        if (value !== this._fillType) {
            if (value === FillType.RADIAL || this._fillType === FillType.RADIAL) {
                // this.destroyRenderData(/*this._renderData*/);
                this._renderData = null;
            }
            else if (this._renderData) {
                this.markForUpdateRenderData(true);
            }
            this._fillType = value;
            this._updateAssembler();
        }
    }
    /**
     * !#en
     * sprite color
     * !#zh
     * 精灵颜色
     * @property color
     * @type {cc.Color}
     * @example
     */
    @property
    get color() {
        return this._color;
    }

    set color(value) {
        this._color = value;
    }

    /**
     * !#en
     * The fill Center, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
     * !#zh
     * 填充中心点，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
     * @property fillCenter
     * @type {Vec2}
     * @example
     * sprite.fillCenter = new cc.Vec2(0, 0);
     */
    @property
    get fillCenter() {
        return this._fillCenter;
    }
    set fillCenter(value) {
        this._fillCenter.x = value.x;
        this._fillCenter.y = value.y;
        if (this._type === SpriteType.FILLED && this._renderData) {
            this.markForUpdateRenderData(true);
        }
    }

    /**
     * !#en
     * The fill Start, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
     * !#zh
     * 填充起始点，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
     * @property fillStart
     * @type {Number}
     * @example
     * // -1 To 1 between the numbers
     * sprite.fillStart = 0.5;
     */
    @property
    get fillStart() {
        return this._fillStart;
    }

    set fillStart(value) {
        this._fillStart = cc.misc.clampf(value, -1, 1);
        if (this._type === SpriteType.FILLED && this._renderData) {
            this.markForUpdateRenderData(true);
        }
    }

    /**
     * !#en
     * The fill Range, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
     * !#zh
     * 填充范围，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
     * @property fillRange
     * @type {Number}
     * @example
     * // -1 To 1 between the numbers
     * sprite.fillRange = 1;
     */
    @property
    get fillRange() {
        return this._fillRange;
    }
    set fillRange(value) {
        // ??? -1 ~ 1
        // this._fillRange = cc.misc.clampf(value, -1, 1);
        this._fillRange = cc.misc.clampf(value, 0, 1);
        if (this._type === SpriteType.FILLED && this._renderData) {
            this.markForUpdateRenderData(true);
        }
    }
    /**
     * !#en specify the frame is trimmed or not.
     * !#zh 是否使用裁剪模式
     * @property trim
     * @type {Boolean}
     * @example
     * sprite.trim = true;
     */
    get trim() {
        return this._isTrimmedMode;
    }

    set trim(value) {
        if (this._isTrimmedMode !== value) {
            this._isTrimmedMode = value;
            if ((this._type === SpriteType.SIMPLE || this._type === SpriteType.MESH) &&
                this._renderData) {
                this.markForUpdateRenderData(true);
            }
        }
    }


    /**
     * !#en specify the size tracing mode.
     * !#zh 精灵尺寸调整模式
     * @property sizeMode
     * @type {Sprite.SizeMode}
     * @example
     * sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
     */
    get sizeMode() {
        return this._sizeMode;
    }
    set sizeMode(value) {
        // this._sizeMode = value;
        // if (value !== SizeMode.CUSTOM) {
        //     this._applySpriteSize();
        // }
    }

    static FillType = FillType;
    static Type = SpriteType;
    static SizeMode = SizeMode;
    static State = State;

    /**
    //  * Change the state of sprite.
    //  * @method setState
    //  * @see `Sprite.State`
    //  * @param state {Sprite.State} NORMAL or GRAY State.
    //  */
    // setState(state) {
    //     if (this._state === state) return;
    //     this._state = state;
    //     this._activateMaterial();
    // }

    // /**
    //  * Gets the current state.
    //  * @method getState
    //  * @see `Sprite.State`
    //  * @return {Sprite.State}
    //  */
    // getState() {
    //     return this._state;
    // }

    onLoad() {

    }

    onEnable() {
        // this._super();

        if (!this._spriteFrame || !this._spriteFrame.textureLoaded()) {
            // Do not render when sprite frame is not ready
            // this.disableRender();
            if (this._spriteFrame) {
                this._spriteFrame.once('load', this._onTextureLoaded, this);
                this._spriteFrame.ensureLoadTexture();
            } else {
                this._spriteFrame = this._initSpriteFrame();
            }

            if (this._texture && this._spriteFrame.getTexture() !== this._texture) {
                this._spriteFrame.setTexture(this._texture);
            }
        }

        this._updateAssembler();
        this._activateMaterial();

        // this.node.on(NodeEvent.SIZE_CHANGED, this._onNodeSizeDirty, this);
        // this.node.on(NodeEvent.ANCHOR_CHANGED, this._onNodeSizeDirty, this);
    }

    updateRenderData(buffer) {
        this._assembler.updateRenderData(this);
        this._assembler.fillBuffers(this, buffer);
    }

    onDestroy() {
        this._assembler.removeData(this);
    }

    onDisable() {
        // this._super();

        // this.node.off(NodeEvent.SIZE_CHANGED, this._onNodeSizeDirty, this);
        // this.node.off(NodeEvent.ANCHOR_CHANGED, this._onNodeSizeDirty, this);
    }

    _onNodeSizeDirty() {
        if (!this._renderData) return;
        this.markForUpdateRenderData(true);
    }

    _updateAssembler() {
        let assembler = Assembler.getAssembler(this);

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this._renderData) {
            this._renderData = this._assembler.createData(this);
            this._renderData.material = this.material;
            this.markForUpdateRenderData(true);
        }
    }

    _activateMaterial() {
        let spriteFrame = this._spriteFrame;

        // WebGL
        if (cc.game.renderType !== cc.game.RENDER_TYPE_CANVAS) {
            // Get material
            // let material;
            // if (this._state === State.GRAY) {
            //     if (!this._graySpriteMaterial) {
            //         this._graySpriteMaterial = new GraySpriteMaterial();
            //     }
            //     material = this._graySpriteMaterial;
            // }
            // else {
            //     if (!this._spriteMaterial) {
            //         this._spriteMaterial = new SpriteMaterial();
            //     }
            //     material = this._spriteMaterial;
            // }
            if (!this.material) {
                this.material = cc.BuiltinResMgr['sprite-material'];
                if (spriteFrame) {
                    this.material.setProperty('mainTexture', spriteFrame._texture);
                }
            }
            // // Set texture
            // if (spriteFrame && spriteFrame.textureLoaded()) {
            //     let texture = spriteFrame.getTexture();
            //     if (material.texture !== texture) {
            //         material.texture = texture;
            //         this._activateMaterial(material);
            //     }
            //     else if (material !== this._material) {
            //         this._activateMaterial(material);
            //     }
            //     if (this._renderData) {
            //         this._renderData.material = material;
            //     }

            //     this.node._renderFlag |= RenderFlow.FLAG_COLOR;
            //     this.markForUpdateRenderData(true);
            //     // this.markForRender(true);
            // }
            // else {
            //     this.disableRender();
            // }
        }
        else {
            this.markForUpdateRenderData(true);
            // this.markForRender(true);
        }
    }

    _applyAtlas(spriteFrame) {
        if (!CC_EDITOR) {
            return;
        }
        // Set atlas
        if (spriteFrame && spriteFrame._atlasUuid) {
            var self = this;
            cc.AssetLibrary.loadAsset(spriteFrame._atlasUuid, function (err, asset) {
                self._atlas = asset;
            });
        } else {
            this._atlas = null;
        }
    }

    _canRender() {
        if (cc.game.renderType === cc.game.RENDER_TYPE_CANVAS) {
            if (!this._enabled) return false;
        }
        else {
            if (!this._enabled || !this.material) return false;
        }

        let spriteFrame = this._spriteFrame;
        if (!spriteFrame || !spriteFrame.textureLoaded()) {
            return false;
        }
        return true;
    }

    markForUpdateRenderData(enable) {
        if (enable /*&& this._canRender()*/) {
            // this.node._renderFlag |= RenderFlow.FLAG_UPDATE_RENDER_DATA;

            let renderData = this._renderData;
            if (renderData) {
                renderData.uvDirty = true;
                renderData.vertDirty = true;
            }
        }
        // else if (!enable) {
        //     this.node._renderFlag &= ~RenderFlow.FLAG_UPDATE_RENDER_DATA;
        // }
    }

    _applySpriteSize() {
        if (this._spriteFrame) {
            if (SizeMode.RAW === this._sizeMode) {
                var size = this._spriteFrame.getOriginalSize();
                this.node.size(size);
                // hack
                this._size.width = size.width;
                this._size.height = size.height;
                // this.node.setContentSize(size);
            } else if (SizeMode.TRIMMED === this._sizeMode) {
                var rect = this._spriteFrame.getRect();
                // hack
                this._size.width = rect.width;
                this._size.height = rect.height;
                // this.node.size(ccclass.size(rect.width, rect.height));
                // this.node.setContentSize(rect.width, rect.height);
            }

            // this._activateMaterial();
        }
    }

    destroyRenderData(data) {
        if (this._assembler) {
            this._assembler.removeData(this);
        }
    }

    _onTextureLoaded() {
        if (!this.isValid) {
            return;
        }

        this._applySpriteSize();
    }

    _applySpriteFrame(oldFrame) {
        if (oldFrame && oldFrame.off) {
            oldFrame.off('load', this._onTextureLoaded, this);
        }

        var spriteFrame = this._spriteFrame;
        // if (!spriteFrame || (this._material && this._material._texture) !== (spriteFrame && spriteFrame._texture)) {
        //     // disable render flow until texture is loaded
        //     this.markForRender(false);
        // }

        if (spriteFrame) {
            if (!oldFrame || spriteFrame._texture !== oldFrame._texture) {
                this.material.setProperty('mainTexture', spriteFrame._texture);
                if (spriteFrame.textureLoaded()) {
                    this._onTextureLoaded(null);
                }
                else {
                    spriteFrame.once('load', this._onTextureLoaded, this);
                    spriteFrame.ensureLoadTexture();
                }
            }
            else {
                this._applySpriteSize();
            }
        }

        if (CC_EDITOR) {
            // Set atlas
            this._applyAtlas(spriteFrame);
        }
    }

    // hack
    _initSpriteFrame() {
        let spriteFrame = this._spriteFrame;
        if (!spriteFrame) {
            spriteFrame = new SpriteFrame();
        }
        let texture = this._texture;
        if (!texture) {
            texture = cc.BuiltinResMgr['white-texture'];
        } else if (spriteFrame._texture !== this._texture) {
            spriteFrame.setTexture(texture);
        }

        spriteFrame._textureLoadedCallback();
        return spriteFrame;
    }

    // _resized: CC_EDITOR && function () {
    //     if (this._spriteFrame) {
    //         var actualSize = this.node.getContentSize();
    //         var expectedW = actualSize.width;
    //         var expectedH = actualSize.height;
    //         if (this._sizeMode === SizeMode.RAW) {
    //             var size = this._spriteFrame.getOriginalSize();
    //             expectedW = size.width;
    //             expectedH = size.height;
    //         } else if (this._sizeMode === SizeMode.TRIMMED) {
    //             var rect = this._spriteFrame.getRect();
    //             expectedW = rect.width;
    //             expectedH = rect.height;

    //         }

    //         if (expectedW !== actualSize.width || expectedH !== actualSize.height) {
    //             this._sizeMode = SizeMode.CUSTOM;
    //         }
    //     }
    // },
}

// if (CC_EDITOR) {
//     // override __preload
//     Sprite.prototype.__superPreload = cc.Component.prototype.__preload;
//     Sprite.prototype.__preload = function () {
//         if (this.__superPreload) this.__superPreload();
//         this.node.on(NodeEvent.SIZE_CHANGED, this._resized, this);
//     };
//     // override onDestroy
//     Sprite.prototype.__superOnDestroy = cc.Component.prototype.onDestroy;
//     Sprite.prototype.onDestroy = function () {
//         if (this.__superOnDestroy) this.__superOnDestroy();
//         this.node.off(NodeEvent.SIZE_CHANGED, this._resized, this);
//     };
// }

// cc.Sprite = module.exports = Sprite;
