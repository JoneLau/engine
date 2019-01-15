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

import Component from '../../components/CCComponent';
import misc from '../../core/utils/misc';
import { ccclass, menu, executionOrder, executeInEditMode, property } from '../../core/data/class-decorator';

var GETTINGSHORTERFACTOR = 20;

/**
 * Enum for Scrollbar direction
 * @enum Scrollbar.Direction
 */
var Direction = cc.Enum({
    /**
     * @property {Number} HORIZONTAL
     */
    HORIZONTAL: 0,

    /**
     * @property {Number} VERTICAL
     */
    VERTICAL: 1
});

/**
 * !#en
 * The Scrollbar control allows the user to scroll an image or other view that is too large to see completely
 * !#zh 滚动条组件
 * @class Scrollbar
 * @extends Component
 */
@ccclass('cc.ScrollBarComponent')
@executionOrder(100)
@menu('UI/ScrollBar')
// @executeInEditMode
export default class ScrollBarComponent extends Component {
    @property
    _scrollView = null;
    _touching = false;
    _autoHideRemainingTime = 0;
    @property
    _handle = null;
    @property
    _direction = Direction.HORIZONTAL;
    @property
    _enableAutoHide = false;
    @property
    _autoHideTime = 1.0;
    /**
     * !#en The "handle" part of the scrollbar.
     * !#zh 作为当前滚动区域位置显示的滑块 Sprite。
     * @property {Sprite} handle
     */
    @property({
        type: cc.Node
    })
    get handle() {
        return this._handle;
    }

    set handle(value) {
        value = value.getComponent(cc.RenderComponent);
        if (this._handle === value) {
            return
        }
        this._handle = value;
        this._onScroll(cc.v2(0, 0));
    }
    /**
     * !#en The direction of scrollbar.
     * !#zh ScrollBar 的滚动方向。
     * @property {Scrollbar.Direction} direction
     */
    @property({
        type: Direction
    })
    get direction() {
        return this._direction;
    }

    set direction(value) {
        if (this._direction === value) {
            return;
        }

        this._direction = value;
        this._onScroll(cc.v2(0, 0));
    }

    /**
     * !#en Whether enable auto hide or not.
     * !#zh 是否在没有滚动动作时自动隐藏 ScrollBar。
     * @property {Boolean} enableAutoHide
     */
    get enableAutoHide() {
        return this._enableAutoHide;
    }

    set enableAutoHide(value) {
        if (this._enableAutoHide === value) {
            return;
        }

        this._enableAutoHide = value;
    }

    /**
     * !#en
     * The time to hide scrollbar when scroll finished.
     * Note: This value is only useful when enableAutoHide is true.
     * !#zh
     * 没有滚动动作后经过多久会自动隐藏。
     * 注意：只要当 “enableAutoHide” 为 true 时，才有效。
     * @property {Number} autoHideTime
     */
    @property
    get autoHideTime() {
        return this._autoHideTime;
    }

    set autoHideTime(value) {
        if (this._autoHideTime === value) {
            return;
        }

        this._autoHideTime = value;
    }

    static Direction = Direction;

    setTargetScrollView(scrollView) {
        this._scrollView = scrollView;
    }

    _convertToScrollViewSpace(content) {
        var worldSpacePos = content.convertToWorldSpace(cc.v2(0, 0));
        var scrollViewSpacePos = this._scrollView.node.convertToNodeSpace(worldSpacePos);
        return scrollViewSpacePos;
    }

    // _setOpacity(opacity) {
    //     if (this._handle) {
    //         this.node.opacity = opacity;
    //         this._handle.node.opacity = opacity;
    //     }
    // }

    _onScroll(outOfBoundary) {
        if (this._scrollView) {

            var content = this._scrollView.content;
            if (content) {
                var contentSize = content.getContentSize();
                var scrollViewSize = this._scrollView.node.getContentSize();
                var handleNodeSize = this.node.getContentSize();

                if (this._conditionalDisableScrollBar(contentSize, scrollViewSize)) {
                    return;
                }

                if (this._enableAutoHide) {
                    this._autoHideRemainingTime = this._autoHideTime;
                    this._setOpacity(this._opacity);
                }

                var contentMeasure = 0;
                var scrollViewMeasure = 0;
                var outOfBoundaryValue = 0;
                var contentPosition = 0;
                var handleNodeMeasure = 0;

                if (this._direction === Direction.HORIZONTAL) {
                    contentMeasure = contentSize.width;
                    scrollViewMeasure = scrollViewSize.width;
                    handleNodeMeasure = handleNodeSize.width;
                    outOfBoundaryValue = outOfBoundary.x;

                    contentPosition = -this._convertToScrollViewSpace(content).x;
                } else if (this._direction === Direction.VERTICAL) {
                    contentMeasure = contentSize.height;
                    scrollViewMeasure = scrollViewSize.height;
                    handleNodeMeasure = handleNodeSize.height;
                    outOfBoundaryValue = outOfBoundary.y;

                    contentPosition = -this._convertToScrollViewSpace(content).y;
                }

                var length = this._calculateLength(contentMeasure, scrollViewMeasure, handleNodeMeasure, outOfBoundaryValue);
                var position = this._calculatePosition(contentMeasure, scrollViewMeasure, handleNodeMeasure, contentPosition, outOfBoundaryValue, length);

                this._updateLength(length);
                this._updateHanlderPosition(position);
            }
        }
    }

    _updateHanlderPosition(position) {
        if (this._handle) {
            var oldPosition = this._fixupHandlerPosition();

            this._handle.node.setPosition(position.x + oldPosition.x, position.y + oldPosition.y);
        }
    }

    _fixupHandlerPosition() {
        var barSize = this.node.getContentSize();
        var barAnchor = this.node.getAnchorPoint();
        var handleSize = this._handle.node.getContentSize();

        var handleParent = this._handle.node.parent;

        var leftBottomWorldPosition = this.node.convertToWorldSpaceAR(cc.v2(-barSize.width * barAnchor.x, -barSize.height * barAnchor.y));
        var fixupPosition = handleParent.convertToNodeSpaceAR(leftBottomWorldPosition);

        if (this._direction === Direction.HORIZONTAL) {
            fixupPosition = cc.v2(fixupPosition.x, fixupPosition.y + (barSize.height - handleSize.height) / 2);
        } else if (this._direction === Direction.VERTICAL) {
            fixupPosition = cc.v2(fixupPosition.x + (barSize.width - handleSize.width) / 2, fixupPosition.y);
        }

        this._handle.node.setPosition(fixupPosition);

        return fixupPosition;
    }

    _onTouchBegan() {
        if (!this._enableAutoHide) {
            return;
        }
        this._touching = true;
    }

    _conditionalDisableScrollBar(contentSize, scrollViewSize) {
        if (contentSize.width <= scrollViewSize.width
            && this._direction === Direction.HORIZONTAL) {
            return true;
        }

        if (contentSize.height <= scrollViewSize.height
            && this._direction === Direction.VERTICAL) {
            return true;
        }
        return false;
    }

    _onTouchEnded() {
        if (!this._enableAutoHide) {
            return;
        }

        this._touching = false;

        if (this._autoHideTime <= 0) {
            return;
        }


        if (this._scrollView) {
            var content = this._scrollView.content;
            if (content) {
                var contentSize = content.getContentSize();
                var scrollViewSize = this._scrollView.node.getContentSize();

                if (this._conditionalDisableScrollBar(contentSize, scrollViewSize)) {
                    return;
                }
            }
        }

        this._autoHideRemainingTime = this._autoHideTime;
    }

    _calculateLength(contentMeasure, scrollViewMeasure, handleNodeMeasure, outOfBoundary) {
        var denominatorValue = contentMeasure;
        if (outOfBoundary) {
            denominatorValue += (outOfBoundary > 0 ? outOfBoundary : -outOfBoundary) * GETTINGSHORTERFACTOR;
        }

        var lengthRation = scrollViewMeasure / denominatorValue;
        return handleNodeMeasure * lengthRation;
    }

    _calculatePosition(contentMeasure, scrollViewMeasure, handleNodeMeasure, contentPosition, outOfBoundary, actualLenth) {
        var denominatorValue = contentMeasure - scrollViewMeasure;
        if (outOfBoundary) {
            denominatorValue += Math.abs(outOfBoundary);
        }

        var positionRatio = 0;
        if (denominatorValue) {
            positionRatio = contentPosition / denominatorValue;
            positionRatio = misc.clamp01(positionRatio);
        }

        var position = (handleNodeMeasure - actualLenth) * positionRatio;
        if (this._direction === Direction.VERTICAL) {
            return cc.v2(0, position);
        } else {
            return cc.v2(position, 0);
        }
    }

    _updateLength(length) {
        if (this._handle) {
            var handleNode = this._handle.node;
            var handleNodeSize = handleNode.getContentSize();
            handleNode.setAnchorPoint(cc.v2(0, 0));
            if (this._direction === Direction.HORIZONTAL) {
                handleNode.setContentSize(length, handleNodeSize.height);
            } else {
                handleNode.setContentSize(handleNodeSize.width, length);
            }
        }
    }

    _processAutoHide(deltaTime) {
        if (!this._enableAutoHide || this._autoHideRemainingTime <= 0) {
            return;
        } else if (this._touching) {
            return;
        }


        this._autoHideRemainingTime -= deltaTime;
        if (this._autoHideRemainingTime <= this._autoHideTime) {
            this._autoHideRemainingTime = Math.max(0, this._autoHideRemainingTime);
            var opacity = this._opacity * (this._autoHideRemainingTime / this._autoHideTime);
            this._setOpacity(opacity);
        }
    }

    start() {
        if (this._enableAutoHide) {
            this._setOpacity(0);
        }
    }

    hide() {
        this._autoHideRemainingTime = 0;
        this._setOpacity(0);
    }

    show() {
        this._autoHideRemainingTime = this._autoHideTime;
        this._setOpacity(this._opacity);
    }

    update(dt) {
        this._processAutoHide(dt);
    }
}
