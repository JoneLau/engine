
import gfx from '../../renderer/gfx/index';
// import SpriteBatchModel from '../../renderer/models/sprite-batch-model';
import { RecyclePool } from '../memop/index';
// import Material from '../../3d/assets/material';
// import { RenderQueue } from '../../renderer/core/constants';
import { mat4 } from '../../core/vmath/index';
import MeshBuffer from './render-data/mesh-buffer';
import { vfmt3D } from '../../2d/renderer/webgl/vertex-format'
import Model from '../../renderer/scene/model';
import InputAssembler from '../../renderer/core/input-assembler';
import CanvasComponent from './components/canvas-component';
import SpriteComponent from './components/sprite-component';
import LabelComponent from './components/label-component';
import RenderComponent from './components/render-component';
import Material from '../assets/material';
import SpriteFrame from '../../assets/CCSpriteFrame';
import { Node } from '../../scene-graph';

export default class UISystem {
    _screens: CanvasComponent[] = [];
    _buffer: MeshBuffer | null = new MeshBuffer(this, vfmt3D);
    _currScreen: CanvasComponent | null = null;
    _currMaterail: Material | null = null;
    _currSpriteFrame: SpriteFrame | null = null;
    _currUserKey: number = 0;
    _dummyNode: Node | null = null;
    _batchedModels: Model[] = [];
    _iaPool: RecyclePool | null = new RecyclePool(function () {
        return new InputAssembler();
    }, 16);
    _modelPool: RecyclePool | null = new RecyclePool(function () {
        return new Model();
    }, 16);

    addScreen(comp) {
        this._screens.push(comp);
        cc.director._renderSystem._scene.addView(comp._view);
        CanvasComponent.views.push({ id: comp._view._id, comp: comp });
    }

    removeScreen(comp) {
        let idx = this._screens.indexOf(comp);
        if (idx !== -1) {
            this._screens.splice(idx, 1);
            cc.director._renderSystem._scene.removeView(comp._view);
            CanvasComponent.views.splice(idx, 1);
        }
    }

    update(dt) {
        // this._screenRenderHelper.reset();
        this.reset();
        this._renderScreens();
    }

    _walk(node, fn1, fn2, level = 0) {
        level += 1;
        let len = node.children.length;

        for (let i = 0; i < len; ++i) {
            let child = node.children[i];
            let continueWalk = fn1(child, node, level);

            if (continueWalk === false) {
                fn2(child, node, level);
                break;
            }

            this._walk(child, fn1, fn2, level);
            // fn2(child, node, level);
        }
    }

    _renderScreens() {
        for (let i = 0; i < this._screens.length; ++i) {
            let screen = this._screens[i];
            if (!screen.enabledInHierarchy) {
                continue;
            }
            this._currScreen = screen;
            this._buffer.reset();
            let view = screen._view;
            // let canvasWidth = screen.designResolution.width;
            // let canvasHeight = screen.designResolution.height;
            screen.node.getWorldRT(view._matView);
            mat4.invert(view._matView, view._matView);
            // let aspect = canvasWidth / canvasHeight;
            let aspect = cc.game.canvas.width / cc.game.canvas.height;
            // let orthoHeight = canvasHeight / 2;
            let orthoHeight = cc.game.canvas.height / cc.view._scaleY / 2;
            let x = orthoHeight * aspect;
            let y = orthoHeight;
            mat4.ortho(view._matProj,
                -x, x, -y, y, 0, 4096
            );

            //mat4.ortho(view._matProj, 0, canvasWidth, 0, canvasHeight, -100, 100);
            mat4.mul(view._matViewProj, view._matProj, view._matView);
            // mat4.copy(view._matViewProj, view._matProj);
            mat4.invert(view._matInvViewProj, view._matViewProj);
            view._rect.x = view._rect.y = 0;
            // view._rect.w = cc.game._renderer._device._gl.canvas.width;
            // view._rect.h = cc.game._renderer._device._gl.canvas.height;
            view._rect.w = cc.game.canvas.width;
            view._rect.h = cc.game.canvas.height;

            this._walk(screen.node, (c) => {
                let renderComp = c.getComponent(RenderComponent);
                if (renderComp) {
                    if (renderComp._viewID !== this._currScreen._view._id) {
                        renderComp._viewID = this._currScreen._view._id;
                    }
                }

                let image = c.getComponent(SpriteComponent);
                if (image && image.enabledInHierarchy) {
                    this._commitComp(image);
                }

                let label = c.getComponent(LabelComponent);
                if (label && label.enabledInHierarchy) {
                    this._commitComp(label);
                }
            }, null);

            this._flush();
            this._buffer.uploadData();
        }
    }

    _commitComp(comp) {
        if (this._currMaterail !== comp.material || this._currSpriteFrame !== comp.spriteFrame) {
            this._flush();
            this._dummyNode = comp.node;
            this._currMaterail = comp.material;
            this._currSpriteFrame = comp.spriteFrame;
        }
        comp.updateRenderData(this._buffer);
    }

    _flush() {
        let material = this._currMaterail,
            buffer = this._buffer,
            indiceStart = buffer.indiceStart,
            indiceOffset = buffer.indiceOffset,
            indiceCount = indiceOffset - indiceStart;
        if (!material || indiceCount <= 0) {
            return;
        }

        // Generate ia
        let ia = this._iaPool.add();
        ia._vertexBuffer = buffer._vb;
        ia._indexBuffer = buffer._ib;
        ia._start = indiceStart;
        ia._count = indiceCount;

        // Check stencil state and modify pass
        // this._stencilMgr.handleEffect(effect);
        _setStencil(
            material,
            false,
            gfx.DS_FUNC_ALWAYS,
            0,
            0,
            gfx.STENCIL_OP_KEEP,
            gfx.STENCIL_OP_KEEP,
            gfx.STENCIL_OP_KEEP,
            0
        );

        // Generate model
        let model = this._modelPool.add();
        this._batchedModels.push(model);
        model.setNode(this._dummyNode);
        model.setEffect(material.effect);
        model.setInputAssembler(ia);
        model._viewID = this._currScreen._view._id;
        model.setUserKey(this._currUserKey++);

        cc.director._renderSystem._scene.addModel(model);

        buffer.byteStart = buffer.byteOffset;
        buffer.indiceStart = buffer.indiceOffset;
        buffer.vertexStart = buffer.vertexOffset;
    }

    reset() {
        for (let i = 0; i < this._batchedModels.length; ++i) {
            let model = this._batchedModels[i];
            cc.director._renderSystem._scene.removeModel(model);
        }

        this._modelPool.reset();
        this._iaPool.reset();
        this._batchedModels.length = 0;
    }
}

function _setStencil(mat, enabled, func, ref, mask, failOp, zFailOp, zPassOp, writeMask) {
    let tech = mat.effect.getTechnique(0);
    for (let i = 0; i < tech.passes.length; ++i) {
        let pass = tech.passes[i];
        pass.setStencilFront(
            enabled, func, ref, mask, failOp, zFailOp, zPassOp, writeMask
        );
        pass.setStencilBack(
            enabled, func, ref, mask, failOp, zFailOp, zPassOp, writeMask
        );
    }
}
