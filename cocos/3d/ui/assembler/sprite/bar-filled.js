/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
import * as js from '../../../core/utils/js';
import { vec3, mat4 } from '../../../core/vmath/index';
import RenderData from '../../../3d/ui/renderData';
import CCSprite from '../CCSprite';

// const js = require('../../../../../platform/js');
// const assembler = require('../2d/bar-filled');
import { fillVerticesWithoutCalc3D } from '../../../2d/renderer/webgl/assemblers/utils';

let matrix = mat4.create();

export default class BarFilled {
    static createData(comp) {
        let renderData = RenderData.add();
        comp._renderData = renderData.data;
        comp._renderDataPoolID = renderData.pooID;
        renderData = comp._renderData;
        // 0-4 for world verts
        // 5-8 for local verts
        renderData.dataLength = 8;
        renderData.vertexCount = 4;
        renderData.indiceCount = 6;
        return renderData;
    }

    static removeData(comp) {
        if (comp._renderData) {
            RenderData.remove(comp._renderDataPoolID);
            comp._renderDataPoolID = -1;
            comp._renderData = null;
        }
    }

    static updateWorldVerts(comp) {
        let node = comp.node,
            data = comp._renderData._data;

        node.getWorldMatrix(matrix);
        for (let i = 0; i < 4; i++) {
            let local = data[i + 4];
            let world = data[i];
            vec3.transformMat4(world, local, matrix);
        }
    }

    static updateRenderData(comp) {
        let frame = comp.spriteFrame;

        // TODO: Material API design and export from editor could affect the material activation process
        // need to update the logic here
        // if (frame) {
        //     if (!frame._original && dynamicAtlasManager) {
        //         dynamicAtlasManager.insertSpriteFrame(frame);
        //     }
        //     if (comp._material._texture !== frame._texture) {
        //         comp._activateMaterial();
        //     }
        // }

        let renderData = comp._renderData;
        if (renderData && frame) {
            let uvDirty = renderData.uvDirty,
                vertDirty = renderData.vertDirty;

            // if (!uvDirty && !vertDirty) {
            //     return comp.__allocedDatas;
            // }

            let fillStart = comp._fillStart;
            let fillRange = comp._fillRange;

            if (fillRange < 0) {
                fillStart += fillRange;
                fillRange = -fillRange;
            }

            fillRange = fillStart + fillRange;

            fillStart = fillStart > 1.0 ? 1.0 : fillStart;
            fillStart = fillStart < 0.0 ? 0.0 : fillStart;

            fillRange = fillRange > 1.0 ? 1.0 : fillRange;
            fillRange = fillRange < 0.0 ? 0.0 : fillRange;
            fillRange = fillRange - fillStart;
            fillRange = fillRange < 0 ? 0 : fillRange;

            let fillEnd = fillStart + fillRange;
            fillEnd = fillEnd > 1 ? 1 : fillEnd;

            if (uvDirty) {
                this.updateUVs(comp, fillStart, fillEnd);
            }
            if (vertDirty) {
                this.updateVerts(comp, fillStart, fillEnd);
                this.updateWorldVerts(comp);
            }
        }
    }

    static updateUVs(comp, fillStart, fillEnd) {
        let spriteFrame = comp._spriteFrame,
            renderData = comp._renderData,
            data = renderData._data;

        //build uvs
        let atlasWidth = spriteFrame._texture.width;
        let atlasHeight = spriteFrame._texture.height;
        let textureRect = spriteFrame._rect;
        //uv computation should take spritesheet into account.
        let ul, vb, ur, vt;
        let quadUV0, quadUV1, quadUV2, quadUV3, quadUV4, quadUV5, quadUV6, quadUV7;
        if (spriteFrame._rotated) {
            ul = (textureRect.x) / atlasWidth;
            vb = (textureRect.y + textureRect.width) / atlasHeight;
            ur = (textureRect.x + textureRect.height) / atlasWidth;
            vt = (textureRect.y) / atlasHeight;

            quadUV0 = quadUV2 = ul;
            quadUV4 = quadUV6 = ur;
            quadUV3 = quadUV7 = vb;
            quadUV1 = quadUV5 = vt;
        }
        else {
            ul = (textureRect.x) / atlasWidth;
            vb = (textureRect.y + textureRect.height) / atlasHeight;
            ur = (textureRect.x + textureRect.width) / atlasWidth;
            vt = (textureRect.y) / atlasHeight;

            quadUV0 = quadUV4 = ul;
            quadUV2 = quadUV6 = ur;
            quadUV1 = quadUV3 = vb;
            quadUV5 = quadUV7 = vt;
        }

        switch (comp._fillType) {
            case CCSprite.FillType.HORIZONTAL:
                data[0].u = quadUV0 + (quadUV2 - quadUV0) * fillStart;
                data[0].v = quadUV1;
                data[1].u = quadUV0 + (quadUV2 - quadUV0) * fillEnd;
                data[1].v = quadUV3;
                data[2].u = quadUV4 + (quadUV6 - quadUV4) * fillStart;
                data[2].v = quadUV5;
                data[3].u = quadUV4 + (quadUV6 - quadUV4) * fillEnd;
                data[3].v = quadUV7;
                break;
            case CCSprite.FillType.VERTICAL:
                data[0].u = quadUV0;
                data[0].v = quadUV1 + (quadUV5 - quadUV1) * fillStart;
                data[1].u = quadUV2;
                data[1].v = quadUV3 + (quadUV7 - quadUV3) * fillStart;
                data[2].u = quadUV4;
                data[2].v = quadUV1 + (quadUV5 - quadUV1) * fillEnd;
                data[3].u = quadUV6;
                data[3].v = quadUV3 + (quadUV7 - quadUV3) * fillEnd;
                break;
            default:
                cc.errorID(2626);
                break;
        }

        renderData.uvDirty = false;
    }

    static updateVerts(comp, fillStart, fillEnd) {
        let renderData = comp._renderData,
            data = renderData._data,
            node = comp.node,
            // width = node.width, height = node.height,
            width = comp.size.width, height = comp.size.height,
            appx = comp.anchor.x * width, appy = comp.anchor.y * height;

        let l = -appx, b = -appy,
            r = width - appx, t = height - appy;

        let progressStart, progressEnd;
        switch (comp._fillType) {
            case CCSprite.FillType.HORIZONTAL:
                progressStart = l + (r - l) * fillStart;
                progressEnd = l + (r - l) * fillEnd;

                l = progressStart;
                r = progressEnd;
                break;
            case CCSprite.FillType.VERTICAL:
                progressStart = b + (t - b) * fillStart;
                progressEnd = b + (t - b) * fillEnd;

                b = progressStart;
                t = progressEnd;
                break;
            default:
                cc.errorID(2626);
                break;
        }

        data[4].x = l;
        data[4].y = b;
        data[5].x = r;
        data[5].y = b;
        data[6].x = l;
        data[6].y = t;
        data[7].x = r;
        data[7].y = t;

        renderData.vertDirty = false;
    }

    static fillBuffers(comp, buffer) {
        // if (renderer.worldMatDirty) {
        this.updateWorldVerts(comp);
        // }

        // buffer
        let /*buffer = renderer._meshBuffer3D,*/
            indiceOffset = buffer.indiceOffset,
            vertexId = buffer.vertexOffset;

        let node = comp.node;
        fillVerticesWithoutCalc3D(node, buffer, comp._renderData, comp._color._val);

        // buffer data may be realloc, need get reference after request.
        let ibuf = buffer._iData;
        ibuf[indiceOffset++] = vertexId;
        ibuf[indiceOffset++] = vertexId + 1;
        ibuf[indiceOffset++] = vertexId + 2;
        ibuf[indiceOffset++] = vertexId + 1;
        ibuf[indiceOffset++] = vertexId + 3;
        ibuf[indiceOffset++] = vertexId + 2;
    }
}

