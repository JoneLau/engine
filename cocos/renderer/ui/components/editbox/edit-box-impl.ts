/****************************************************************************
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2012 James Chen
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

import { ccclass } from '../../../../core/data/class-decorator';
import { contains } from '../../../../core/utils/misc';
import macro from '../../../../core/platform/CCMacro';
// import { InputMode, InputFlag, KeyboardReturnType } from './types';
import * as Types from './types';
import * as math from '../../../../core/vmath';
import { Size, Color } from '../../../../core/value-types';
import { Node } from '../../../../scene-graph';
import EditBoxComponent from './edit-box-component';
const InputMode = Types.InputMode;
const InputFlag = Types.InputFlag;
const KeyboardReturnType = Types.KeyboardReturnType;

// https://segmentfault.com/q/1010000002914610
let SCROLLY = 40;
let LEFT_PADDING = 2;
let DELAY_TIME = 400;
let FOCUS_DELAY_UC = 400;
let FOCUS_DELAY_FIREFOX = 0;

let _matrix = cc.mat4();
let _matrix_temp = cc.mat4();
let _vec3 = cc.v3();

let _currentEditBoxImpl = null;

// polyfill
let polyfill = {
    zoomInvalid: false
};

if (cc.sys.OS_ANDROID === cc.sys.os &&
    (cc.sys.browserType === cc.sys.BROWSER_TYPE_SOUGOU ||
        cc.sys.browserType === cc.sys.BROWSER_TYPE_360)) {
    polyfill.zoomInvalid = true;
}

function getKeyboardReturnType(type) {
    switch (type) {
        case KeyboardReturnType.DEFAULT:
        case KeyboardReturnType.DONE:
            return 'done';
        case KeyboardReturnType.SEND:
            return 'send';
        case KeyboardReturnType.SEARCH:
            return 'search';
        case KeyboardReturnType.GO:
            return 'go';
        case KeyboardReturnType.NEXT:
            return 'next';
    }
    return 'done';
}

@ccclass
export default class EditBoxImpl {
    _delegate: EditBoxComponent | null = null;
    _inputMode: number = -1;
    _inputFlag: number = -1;
    _returnType: number = KeyboardReturnType.DEFAULT;
    _maxLength: number = 50;
    _text: string = '';
    _placeholderText: string = '';
    _alwaysOnTop: boolean = false;
    _size: Size = cc.size();
    _node: Node = null;
    _editing: boolean = false;
    __eventListeners: object = {};
    __fullscreen: boolean = false;
    __autoResize: boolean = false;
    __rotateScreen: boolean = false;
    __orientationChanged: Function | null = null;
    _edTxt: HTMLElement | null = null;
    _textColor: Color = Color.WHITE;

    onEnable() {
        if (!this._edTxt) {
            return;
        }
        if (this._alwaysOnTop) {
            this._edTxt.style.display = '';
        }
        else {
            this._edTxt.style.display = 'none';
        }
    }

    onDisable() {
        if (!this._edTxt) {
            return;
        }
        this._edTxt.style.display = 'none';
    }

    setTabIndex(index) {
        if (this._edTxt) {
            this._edTxt.tabIndex = index;
        }
    }

    setFocus() {
        this._beginEditing();
    }

    isFocused() {
        if (this._edTxt) {
            return document.activeElement === this._edTxt;
        }
        cc.warnID(4700);
        return false;
    }

    stayOnTop(flag) {
        if (this._alwaysOnTop === flag || !this._edTxt) return;

        this._alwaysOnTop = flag;

        if (flag) {
            this._edTxt.style.display = '';
        } else {
            this._edTxt.style.display = 'none';
        }
    }

    setMaxLength(maxLength) {
        if (!isNaN(maxLength)) {
            if (maxLength < 0) {
                //we can't set Number.MAX_VALUE to input's maxLength property
                //so we use a magic number here, it should works at most use cases.
                maxLength = 65535;
            }
            this._maxLength = maxLength;
            this._edTxt && (this._edTxt.maxLength = maxLength);
        }
    }

    setString(text) {
        this._text = text;
        this._edTxt && (this._edTxt.value = text);
    }

    getString() {
        return this._text;
    }

    setPlaceholderText(text) {
        this._placeholderText = text;
    }

    getPlaceholderText() {
        return this._placeholderText;
    }

    setDelegate(delegate) {
        this._delegate = delegate;
    }

    setInputMode(inputMode) {
        if (this._inputMode === inputMode) return;

        this._inputMode = inputMode;
        this.createInput();

        this._updateDomInputType();
        this._updateSize(this._size.width, this._size.height);
    }

    setInputFlag(inputFlag) {
        if (this._inputFlag === inputFlag) return;

        this._inputFlag = inputFlag;
        this._updateDomInputType();

        let textTransform = 'none';

        if (inputFlag === InputFlag.INITIAL_CAPS_ALL_CHARACTERS) {
            textTransform = 'uppercase';
        }
        else if (inputFlag === InputFlag.INITIAL_CAPS_WORD) {
            textTransform = 'capitalize';
        }

        if (this._edTxt) {
            this._edTxt.style.textTransform = textTransform;
            this._edTxt.value = this._text;
        }
    }

    setReturnType(returnType) {
        this._returnType = returnType;
        this._updateDomInputType();
    }

    setFontSize(fontSize) {
        this._edFontSize = fontSize || this._edFontSize;
        this._edTxt && (this._edTxt.style.fontSize = this._edFontSize + 'px');
    }

    setFontColor(color) {
        this._textColor = color;
        this._edTxt && (this._edTxt.style.color = color.toCSS('rgba'));
    }

    setSize(width, height) {
        this._size.width = width;
        this._size.height = height;
        this._updateSize(width, height);
    }

    setNode(node) {
        this._node = node;
    }

    update() {
        // TODO: find better way to update matrix
        // if (this._editing) {
        this._updateMatrix();
        // }
    }

    clear() {
        this._node = null;
        this.setDelegate(null);
        this.removeDom();
    }

    _onTouchBegan(touch) {

    }

    _onTouchEnded() {
        this._beginEditing();
    }

    _beginEditing() {
        if (cc.sys.isMobile && !this._editing) {
            // Pre adaptation
            this._beginEditingOnMobile();
        }

        if (this._edTxt) {
            this._edTxt.style.display = '';

            let self = this;
            function startFocus() {
                self._edTxt.focus();
            }

            if (cc.sys.browserType === cc.sys.BROWSER_TYPE_UC) {
                setTimeout(startFocus, FOCUS_DELAY_UC);
            }
            else if (cc.sys.browserType === cc.sys.BROWSER_TYPE_FIREFOX) {
                setTimeout(startFocus, FOCUS_DELAY_FIREFOX);
            }
            else {
                startFocus();
            }
        }

        this._editing = true;
    }

    _endEditing() {
        let self = this;
        let hideDomInputAndShowLabel = function () {
            if (!self._alwaysOnTop && self._edTxt) {
                self._edTxt.style.display = 'none';
            }
            if (self._delegate && self._delegate.editBoxEditingDidEnded) {
                self._delegate.editBoxEditingDidEnded();
            }
        };
        if (this._editing) {
            if (cc.sys.isMobile) {
                // Delay end editing adaptation to ensure virtual keyboard is disapeared
                setTimeout(function () {
                    self._endEditingOnMobile();
                    hideDomInputAndShowLabel();
                }, DELAY_TIME);
            }
            else {
                hideDomInputAndShowLabel();
            }
        }
        this._editing = false;
    }

    _updateDomInputType() {
        let inputMode = this._inputMode;
        let edTxt = this._edTxt;
        if (!edTxt) return;

        if (this._inputFlag === InputFlag.PASSWORD) {
            edTxt.type = 'password';
            return;
        }

        let type = edTxt.type;
        if (inputMode === InputMode.EMAIL_ADDR) {
            type = 'email';
        } else if (inputMode === InputMode.NUMERIC || inputMode === InputMode.DECIMAL) {
            type = 'number';
        } else if (inputMode === InputMode.PHONE_NUMBER) {
            type = 'number';
            edTxt.pattern = '[0-9]*';
        } else if (inputMode === InputMode.URL) {
            type = 'url';
        } else {
            type = 'text';

            if (this._returnType === KeyboardReturnType.SEARCH) {
                type = 'search';
            }
        }

        edTxt.type = type;
    }

    _updateSize(newWidth, newHeight) {
        let edTxt = this._edTxt;
        if (!edTxt) return;

        edTxt.style.width = newWidth + 'px';
        edTxt.style.height = newHeight + 'px';
    }

    _updateMatrix() {
        if (!this._edTxt) return;

        let node = this._node,
            scaleX = cc.view._scaleX, scaleY = cc.view._scaleY,
            viewport = cc.view._viewportRect,
            dpr = cc.view._devicePixelRatio;

        node.getWorldMatrix(_matrix);
        let contentSize = node._contentSize;
        _vec3.x = -node._anchorPoint.x * contentSize.width;
        _vec3.y = -node._anchorPoint.y * contentSize.height;

        math.mat4.translate(_matrix, _matrix, _vec3);

        let camera;
        // can't find camera in editor
        // if (CC_EDITOR) {
        //     camera = cc.Camera.main;
        // }
        // else {
        //     camera = cc.Camera.findCamera(node);
        // }
        let renderComp = node.getComponent(cc.RenderComponent);
        if (!renderComp) {
            return false;
        }
        let canvas = cc.CanvasComponent.findView(renderComp);
        if (!canvas) {
            return;
        }

        // camera.getWorldToCameraMatrix(_matrix_temp);
        canvas.node.getWorldRT(_matrix_temp);
        let m12 = _matrix_temp.m12;
        let m13 = _matrix_temp.m13;
        let center = cc.visibleRect.center;
        _matrix_temp.m12 = center.x - (_matrix_temp.m00 * m12 + _matrix_temp.m04 * m13);
        _matrix_temp.m13 = center.y - (_matrix_temp.m01 * m12 + _matrix_temp.m05 * m13);

        math.mat4.mul(_matrix_temp, _matrix_temp, _matrix);

        scaleX /= dpr;
        scaleY /= dpr;

        let container = cc.game.container;
        let a = _matrix_temp.m00 * scaleX, b = _matrix.m01, c = _matrix.m04, d = _matrix_temp.m05 * scaleY;

        let offsetX = container && container.style.paddingLeft && parseInt(container.style.paddingLeft);
        offsetX += viewport.x / dpr;
        let offsetY = container && container.style.paddingBottom && parseInt(container.style.paddingBottom);
        offsetY += viewport.y / dpr;
        let tx = _matrix_temp.m12 * scaleX + offsetX, ty = _matrix_temp.m13 * scaleY + offsetY;

        if (polyfill.zoomInvalid) {
            this._updateSize(this._size.width * a, this._size.height * d);
            a = 1;
            d = 1;
        }

        let matrix = "matrix(" + a + "," + -b + "," + -c + "," + d + "," + tx + "," + -ty + ")";
        this._edTxt.style['transform'] = matrix;
        this._edTxt.style['-webkit-transform'] = matrix;
        this._edTxt.style['transform-origin'] = '0px 100% 0px';
        this._edTxt.style['-webkit-transform-origin'] = '0px 100% 0px';
    }

    _adjustEditBoxPosition() {
        this._node.getWorldMatrix(_matrix);
        let y = _matrix.m13;
        let windowHeight = cc.visibleRect.height;
        let windowWidth = cc.visibleRect.width;
        let factor = 0.5;
        if (windowWidth > windowHeight) {
            factor = 0.7;
        }
        setTimeout(function () {
            if (window.scrollY < SCROLLY && y < windowHeight * factor) {
                let scrollOffset = windowHeight * factor - y - window.scrollY;
                if (scrollOffset < 35) scrollOffset = 35;
                if (scrollOffset > 320) scrollOffset = 320;
                window.scrollTo(0, scrollOffset);
            }
        }, DELAY_TIME);
    }

    createInput() {
        if (this._inputMode === InputMode.ANY) {
            this._createDomTextArea();
        }
        else {
            this._createDomInput();
        }
    }

    // Called before editbox focus to register cc.view status
    _beginEditingOnMobile() {
        let self = this;
        this.__orientationChanged = function () {
            self._adjustEditBoxPosition();
        };
        window.addEventListener('orientationchange', this.__orientationChanged);

        if (cc.view.isAutoFullScreenEnabled()) {
            this.__fullscreen = true;
            cc.view.enableAutoFullScreen(false);
            cc.screen.exitFullScreen();
        } else {
            this.__fullscreen = false;
        }
        this.__autoResize = cc.view._resizeWithBrowserSize;
        cc.view.resizeWithBrowserSize(false);
        _currentEditBoxImpl = this;
    }

    // Called after keyboard disappeared to readapte the game view
    _endEditingOnMobile() {
        if (this.__rotateScreen) {
            cc.game.container.style['-webkit-transform'] = 'rotate(90deg)';
            cc.game.container.style.transform = 'rotate(90deg)';

            let view = cc.view;
            let width = view._originalDesignResolutionSize.width;
            let height = view._originalDesignResolutionSize.height;
            if (width > 0) {
                view.setDesignResolutionSize(width, height, view._resolutionPolicy);
            }
            this.__rotateScreen = false;
        }

        window.removeEventListener('orientationchange', this.__orientationChanged);

        if (this.__fullscreen) {
            cc.view.enableAutoFullScreen(true);
        }

        // In case focus on editBox A from editBox B
        // A disable resizeWithBrowserSize
        // whilte B enable resizeWithBrowserSize
        // Only _currentEditBoxImpl can enable resizeWithBrowserSize
        if (this.__autoResize && _currentEditBoxImpl === this) {
            cc.view.resizeWithBrowserSize(true);
        }
    }

    _createDomInput() {
        this.removeDom();

        let tmpEdTxt = this._edTxt = document.createElement('input');
        tmpEdTxt.type = 'text';
        tmpEdTxt.style.fontSize = this._edFontSize + 'px';
        tmpEdTxt.style.color = '#000000';
        tmpEdTxt.style.border = 0;
        tmpEdTxt.style.background = 'transparent';
        tmpEdTxt.style.width = '100%';
        tmpEdTxt.style.height = '100%';
        tmpEdTxt.style.active = 0;
        tmpEdTxt.style.outline = 'medium';
        tmpEdTxt.style.padding = '0';
        tmpEdTxt.style.textTransform = 'uppercase';
        tmpEdTxt.style.display = 'none';
        tmpEdTxt.style.position = "absolute";
        tmpEdTxt.style.bottom = "0px";
        tmpEdTxt.style.left = LEFT_PADDING + "px";
        tmpEdTxt.style['-moz-appearance'] = 'textfield';
        tmpEdTxt.style.className = "cocosEditBox";
        tmpEdTxt.style.fontFamily = 'Arial';

        registerInputEventListener(tmpEdTxt, this);

        return tmpEdTxt;
    }

    _createDomTextArea() {
        this.removeDom();

        let tmpEdTxt = this._edTxt = document.createElement('textarea');
        tmpEdTxt.type = 'text';
        tmpEdTxt.style.fontSize = this._edFontSize + 'px';
        tmpEdTxt.style.color = '#000000';
        tmpEdTxt.style.border = 0;
        tmpEdTxt.style.background = 'transparent';
        tmpEdTxt.style.width = '100%';
        tmpEdTxt.style.height = '100%';
        tmpEdTxt.style.active = 0;
        tmpEdTxt.style.outline = 'medium';
        tmpEdTxt.style.padding = '0';
        tmpEdTxt.style.resize = 'none';
        tmpEdTxt.style.textTransform = 'uppercase';
        tmpEdTxt.style.overflow_y = 'scroll';
        tmpEdTxt.style.display = 'none';
        tmpEdTxt.style.position = "absolute";
        tmpEdTxt.style.bottom = "0px";
        tmpEdTxt.style.left = LEFT_PADDING + "px";
        tmpEdTxt.style.className = "cocosEditBox";
        tmpEdTxt.style.fontFamily = 'Arial';

        registerInputEventListener(tmpEdTxt, this, true);

        return tmpEdTxt;
    }

    _addDomToGameContainer() {
        cc.game.container.appendChild(this._edTxt);
    }

    removeDom() {
        let edTxt = this._edTxt;
        if (edTxt) {
            // Remove listeners
            let cbs = this.__eventListeners;
            edTxt.removeEventListener('compositionstart', cbs.compositionstart);
            edTxt.removeEventListener('compositionend', cbs.compositionend);
            edTxt.removeEventListener('input', cbs.input);
            edTxt.removeEventListener('focus', cbs.focus);
            edTxt.removeEventListener('keypress', cbs.keypress);
            edTxt.removeEventListener('blur', cbs.blur);
            cbs.compositionstart = null;
            cbs.compositionend = null;
            cbs.input = null;
            cbs.focus = null;
            cbs.keypress = null;
            cbs.blur = null;

            let hasChild = contains(cc.game.container, edTxt);
            if (hasChild) {
                cc.game.container.removeChild(edTxt);
            }
        }
        this._edTxt = null;
    }
}

function _inputValueHandle(input, editBoxImpl) {
    if (input.value.length > editBoxImpl._maxLength) {
        input.value = input.value.slice(0, editBoxImpl._maxLength);
    }
    if (editBoxImpl._delegate && editBoxImpl._delegate.editBoxTextChanged) {
        if (editBoxImpl._text !== input.value) {
            editBoxImpl._text = input.value;
            editBoxImpl._delegate.editBoxTextChanged(editBoxImpl._text);
        }
    }
}

function registerInputEventListener(tmpEdTxt: HTMLElement, editBoxImpl: EditBoxImpl, isTextarea: boolean = false) {
    let inputLock = false;
    let cbs = editBoxImpl.__eventListeners;
    cbs.compositionstart = function () {
        inputLock = true;
    };
    tmpEdTxt.addEventListener('compositionstart', cbs.compositionstart);

    cbs.compositionend = function () {
        inputLock = false;
        _inputValueHandle(this, editBoxImpl);
    };
    tmpEdTxt.addEventListener('compositionend', cbs.compositionend);

    cbs.input = function () {
        if (inputLock) {
            return;
        }
        _inputValueHandle(this, editBoxImpl);
    };
    tmpEdTxt.addEventListener('input', cbs.input);

    cbs.focus = function () {
        this.style.fontSize = editBoxImpl._edFontSize + 'px';
        this.style.color = editBoxImpl._textColor.toCSS('rgba');
        // When stayOnTop, input will swallow touch event
        if (editBoxImpl._alwaysOnTop) {
            editBoxImpl._editing = true;
        }

        if (cc.sys.isMobile) {
            editBoxImpl._beginEditingOnMobile();
        }

        if (editBoxImpl._delegate && editBoxImpl._delegate.editBoxEditingDidBegan) {
            editBoxImpl._delegate.editBoxEditingDidBegan();
        }

    };
    tmpEdTxt.addEventListener('focus', cbs.focus);

    cbs.keypress = function (e) {
        if (e.keyCode === macro.KEY.enter) {
            e.stopPropagation();

            if (editBoxImpl._delegate && editBoxImpl._delegate.editBoxEditingReturn) {
                editBoxImpl._delegate.editBoxEditingReturn();
            }
            if (!isTextarea) {
                editBoxImpl._text = this.value;
                editBoxImpl._endEditing();
                cc.game.canvas.focus();
            }
        }
    };
    tmpEdTxt.addEventListener('keypress', cbs.keypress);

    cbs.blur = function () {
        editBoxImpl._text = this.value;
        editBoxImpl._endEditing();
    };
    tmpEdTxt.addEventListener('blur', cbs.blur);

    editBoxImpl._addDomToGameContainer();
}
