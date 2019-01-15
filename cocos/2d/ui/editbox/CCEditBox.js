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

import { ccclass, menu, executionOrder, executeInEditMode, property } from '../../../core/data/class-decorator';
import Component from '../../../components/CCComponent';
import Color from '../../../core/value-types/color';
import macro from '../../../core/platform/CCMacro';
import EditBoxImpl from './CCEditBoxImpl';
import LabelComponent from './../../../3d/ui/CCLabel';
// import { InputMode, InputFlag, KeyboardReturnType } from './types';
import * as Types from './types';
const InputMode = Types.InputMode;
const InputFlag = Types.InputFlag;
const KeyboardReturnType = Types.KeyboardReturnType;

const LEFT_PADDING = 2;

function capitalize(string) {
    return string.replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


/**
 * !#en cc.EditBox is a component for inputing text, you can use it to gather small amounts of text from users.
 * !#zh EditBox 组件，用于获取用户的输入文本。
 * @class EditBox
 * @extends Component
 */

@ccclass('cc.EditBoxComponent')
@executionOrder(100)
@menu('UI/EditBox')
@executeInEditMode
export default class EditBoxComponent extends Component {
    @property
    _useOriginalSize = true;
    @property
    _string = '';
    @property
    _tabIndex = 0;
    @property
    _backgroundImage = null;
    @property
    _returnType = KeyboardReturnType.DEFAULT;
    @property
    _inputFlag = InputFlag.DEFAULT;
    @property
    _inputMode = InputMode.SINGLE_LINE;
    @property
    _fontSize = 20;
    @property
    _lineHeight = 40;
    @property
    _maxLength = 20;
    @property
    _fontColor = Color.WHITE;
    @property
    _placeholder = 'Enter text here...';
    @property
    _placeholderFontSize = 20;
    @property
    _placeholderFontColor = Color.GRAY;
    @property
    _stayOnTop = false;
    @property
    _editingDidBegan = [];
    @property
    _editingDidEnded = [];
    @property
    _editingReturn = [];
    @property
    _textChanged = [];

    /**
     * !#en Input string of EditBox.
     * !#zh 输入框的初始输入内容，如果为空则会显示占位符的文本。
     * @property {String} string
     */
    @property
    get string() {
        return this._string;
    }

    set string(value) {
        if (this._maxLength >= 0 && value.length >= this._maxLength) {
            value = value.slice(0, this._maxLength);
        }

        this._string = value;
        if (this._impl) {
            this._updateString(value);
        }
    }

    /**
     * !#en The background image of EditBox.
     * !#zh 输入框的背景图片
     * @property {SpriteFrame} backgroundImage
     */
    @property({
        type: cc.SpriteFrame
    })
    get backgroundImage() {
        return this._backgroundImage;
    }

    set backgroundImage(value) {
        if (this._backgroundImage === value) {
            return;
        }

        this._backgroundImage = value;
        this._createBackgroundSprite();
    }

    /**
     * !#en
     * The return key type of EditBox.
     * Note: it is meaningless for web platforms and desktop platforms.
     * !#zh
     * 指定移动设备上面回车按钮的样式。
     * 注意：这个选项对 web 平台与 desktop 平台无效。
     * @property {EditBox.KeyboardReturnType} returnType
     * @default KeyboardReturnType.DEFAULT
     */
    @property({
        type: KeyboardReturnType
    })
    get returnType() {
        return this._returnType;
    }

    set returnType(value) {
        this._returnType = value;
        if (this._impl) {
            this._impl.returnType = this._returnType;
        }
    }


    /**
     * !#en Set the input flags that are to be applied to the EditBox.
     * !#zh 指定输入标志位，可以指定输入方式为密码或者单词首字母大写。
     * @property {EditBox.InputFlag} inputFlag
     * @default InputFlag.DEFAULT
     */
    @property({
        type: InputFlag
    })
    get inputFlag() {
        return this._inputFlag;
    }

    set inputFlag(value) {
        this._inputFlag = value;
        if (this._impl) {
            this._impl.setInputFlag(this._inputFlag);
            this._updateString(this._string);
        }
    }
    /**
     * !#en
     * Set the input mode of the edit box.
     * If you pass ANY, it will create a multiline EditBox.
     * !#zh
     * 指定输入模式: ANY表示多行输入，其它都是单行输入，移动平台上还可以指定键盘样式。
     * @property {EditBox.InputMode} inputMode
     * @default InputMode.ANY
     */
    @property({
        type: InputMode
    })
    get inputMode() {
        return this._inputMode;
    }

    set inputMode(value) {
        this._inputMode = value;
        if (this._impl) {
            this._impl.setInputMode(this._inputMode);
        }
    }

    /**
     * !#en Font size of the input text.
     * !#zh 输入框文本的字体大小
     * @property {Number} fontSize
     */
    @property
    get fontSize() {
        return this._fontSize;
    }

    set fontSize(value) {
        if (this._fontSize === value) {
            return;
        }

        this._fontSize = value;
        if (this._textLabel) {
            this._textLabel.fontSize = this._fontSize;
        }
        if (this._impl) {
            this._impl.setFontSize(this._fontSize);
        }
    }


    /**
     * !#en Change the lineHeight of displayed text.
     * !#zh 输入框文本的行高。
     * @property {Number} lineHeight
     */
    @property
    get lineHeight() {
        return this._lineHeight;
    }

    set lineHeight(value) {
        if (this._lineHeight === value) {
            return;
        }

        this._lineHeight = value;
        if (this._textLabel) {
            this._textLabel.lineHeight = this._lineHeight;
        }
    }


    /**
     * !#en Font color of the input text.
     * !#zh 输入框文本的颜色。
     * @property {Color} fontColor
     */
    @property({
        type: Color
    })
    get fontColor() {
        return this._fontColor;
    }

    set fontColor(value) {
        if (this._fontColor === value) {
            return
        }

        this._fontColor = value;
        if (this._textLabel) {
            this._textLabel.node.opacity = this._fontColor.a;
            this._textLabel.node.color = this._fontColor;
        }
        if (this._impl) {
            this._impl.setFontColor(this._fontColor);
        }
    }

    /**
     * !#en The display text of placeholder.
     * !#zh 输入框占位符的文本内容。
     * @property {String} placeholder
     */
    @property
    get placeholder() {
        return this._placeholder;
    }

    set placeholder(value) {
        if (this._placeholder === value) {
            return;
        }

        this._placeholder = value;
        if (this._placeholderLabel) {
            this._placeholderLabel.string = this._placeholder;
        }
        if (this._impl) {
            this._impl.setPlaceholderText(this._placeholder);
        }
    }

    /**
     * !#en The font size of placeholder.
     * !#zh 输入框占位符的字体大小。
     * @property {Number} placeholderFontSize
     */
    @property
    get placeholderFontSize() {
        return this._placeholderFontSize;
    }

    set placeholderFontSize(value) {
        if (this._placeholderFontSize === value) {
            return;
        }

        this._placeholderFontSize = value;
        if (this._placeholderLabel) {
            this._placeholderLabel.fontSize = this._placeholderFontSize;
        }
    }

    /**
     * !#en The font color of placeholder.
     * !#zh 输入框占位符的字体颜色。
     * @property {Color} placeholderFontColor
     */
    @property
    get placeholderFontColor() {
        return this._placeholderFontColor;
    }

    set placeholderFontColor(value) {
        if (this._placeholderFontColor === value) {
            return;
        }

        this._placeholderFontColor = value;
        if (this._placeholderLabel) {
            this._placeholderLabel.node.color = this._placeholderFontColor;
            this._placeholderLabel.node.opacity = this._placeholderFontColor.a;
        }
    }

    /**
     * !#en The maximize input length of EditBox.
     * - If pass a value less than 0, it won't limit the input number of characters.
     * - If pass 0, it doesn't allow input any characters.
     * !#zh 输入框最大允许输入的字符个数。
     * - 如果值为小于 0 的值，则不会限制输入字符个数。
     * - 如果值为 0，则不允许用户进行任何输入。
     * @property {Number} maxLength
     */
    @property
    get maxLength() {
        return this._maxLength;
    }
    set maxLength(value) {
        if (this._maxLength === value) {
            return
        }

        this._maxLength = value;
        if (this._impl) {
            this._impl.setMaxLength(this._maxLength);
        }
    }

    /**
     * !#en The input is always visible and be on top of the game view (only useful on Web).
     * !zh 输入框总是可见，并且永远在游戏视图的上面（这个属性只有在 Web 上面修改有意义）
     * Note: only available on Web at the moment.
     * @property {Boolean} stayOnTop
     */
    @property
    get stayOnTop() {
        return this._stayOnTop;
    }

    set stayOnTop(value) {
        this._stayOnTop = value;
        if (this._impl) {
            this._updateStayOnTop();
        }
    }

    /**
     * !#en Set the tabIndex of the DOM input element (only useful on Web).
     * !#zh 修改 DOM 输入元素的 tabIndex（这个属性只有在 Web 上面修改有意义）。
     * @property {Number} tabIndex
     */
    @property
    get tabIndex() {
        return this._tabIndex;
    }

    set tabIndex(value) {
        this._tabIndex = value;
        if (this._impl) {
            this._impl.setTabIndex(value);
        }
    }

    /**
     * !#en The event handler to be called when EditBox began to edit text.
     * !#zh 开始编辑文本输入框触发的事件回调。
     * @property {Component.EventHandler[]} editingDidBegan
     */
    @property({
        type: [cc.Component.EventHandler]
    })
    get editingDidBegan() {
        return this._editingDidBegan;
    }

    set editingDidBegan(value) {
        this._editingDidBegan = value;
    }

    /**
     * !#en The event handler to be called when EditBox text changes.
     * !#zh 编辑文本输入框时触发的事件回调。
     * @property {Component.EventHandler[]} textChanged
     */
    @property({
        type: [cc.Component.EventHandler]
    })
    get textChanged() {
        return this._textChanged;
    }

    set textChanged(value) {
        this._textChanged = value;
    }

    /**
     * !#en The event handler to be called when EditBox edit ends.
     * !#zh 结束编辑文本输入框时触发的事件回调。
     * @property {Component.EventHandler[]} editingDidEnded
     */
    @property({
        type: [cc.Component.EventHandler]
    })
    get editingDidEnded() {
        return this._editingDidEnded;
    }

    set editingDidEnded(value) {
        this._editingDidEnded = value;
    }

    /**
     * !#en The event handler to be called when return key is pressed. Windows is not supported.
     * !#zh 当用户按下回车按键时的事件回调，目前不支持 windows 平台
     * @property {Component.EventHandler[]} editingReturn
     */
    @property({
        type: [cc.Component.EventHandler]
    })
    get editingReturn() {
        return this._editingReturn;
    }

    set editingReturn(value) {
        this._editingReturn = value;
    }

    static _EditBoxImpl = EditBoxImpl;
    static KeyboardReturnType = KeyboardReturnType;
    static InputFlag = InputFlag;
    static InputMode = InputMode;

    onEnable() {
        this._impl && this._impl.onEnable();
    }

    onDisable() {
        this._impl && this._impl.onDisable();
    }

    onDestroy() {
        this._impl.clear();
    }

    _init() {
        this._createBackgroundSprite();
        this._createLabels();
        this.node.on(cc.NodeUI.EventType.SIZE_CHANGED, this._resizeChildNodes, this);

        let impl = this._impl = new EditBoxImpl();

        impl.setDelegate(this);
        impl.setNode(this.node);
        impl.setInputMode(this._inputMode);
        impl.setMaxLength(this._maxLength);
        impl.setInputFlag(this._inputFlag);
        impl.setReturnType(this._returnType);
        impl.setTabIndex(this._tabIndex);
        impl.setFontColor(this._fontColor);
        impl.setFontSize(this._fontSize);
        impl.setPlaceholderText(this._placeholder);

        this._updateStayOnTop();
        this._updateString(this._string);
        this._syncSize();
    }

    __preload() {
        if (!CC_EDITOR) {
            this._registerEvent();
        }
        this._init();
    }

    _registerEvent() {
        this.node.on(cc.NodeUI.EventType.TOUCH_START, this._onTouchBegan, this);
        this.node.on(cc.NodeUI.EventType.TOUCH_END, this._onTouchEnded, this);
    }

    _updateStayOnTop() {
        if (this.stayOnTop) {
            this._hideLabels();
        }
        else {
            this._showLabels();
        }
        this._impl.stayOnTop(this.stayOnTop);
    }

    _syncSize() {
        let size = this.node.getContentSize();

        this._background.node.setAnchorPoint(this.node.getAnchorPoint());
        this._background.node.setContentSize(size);

        this._updateLabelPosition(size);
        this._impl.setSize(size.width, size.height);
    }

    _updateLabelPosition(size) {
        let node = this.node;
        let offx = -node.anchorX * node.width;
        let offy = -node.anchorY * node.height;

        let placeholderLabel = this._placeholderLabel;
        let textLabel = this._textLabel;

        textLabel.node.setContentSize(size.width - LEFT_PADDING, size.height);
        placeholderLabel.node.setContentSize(size.width - LEFT_PADDING, size.height);
        placeholderLabel.lineHeight = size.height;

        placeholderLabel.node.setPosition(offx + LEFT_PADDING, offy + size.height);
        textLabel.node.setPosition(offx + LEFT_PADDING, offy + size.height);

        if (this._inputMode === InputMode.ANY) {
            placeholderLabel.verticalAlign = macro.VerticalTextAlignment.TOP;
            placeholderLabel.enableWrapText = true;
            textLabel.verticalAlign = macro.VerticalTextAlignment.TOP;
            textLabel.enableWrapText = true;
        }
        else {
            placeholderLabel.verticalAlign = macro.VerticalTextAlignment.CENTER;
            placeholderLabel.enableWrapText = false;
            textLabel.verticalAlign = macro.VerticalTextAlignment.CENTER;
            textLabel.enableWrapText = false;
        }
    }

    _createBackgroundSprite() {
        if (!this._background) {
            this._background = this.node.getComponent(cc.SpriteComponent);
            if (!this._background) {
                this._background = this.node.addComponent(cc.SpriteComponent);
            }
            this._background.type = cc.SpriteComponent.Type.SLICED;
        }

        this._background.spriteFrame = this._backgroundImage;
        // let background = this._background;
        // if (!background) {
        //     let node = this.node.getChildByName('BACKGROUND_SPRITE');
        //     if (!node) {
        //         node = new cc.NodeUI('BACKGROUND_SPRITE');
        //     }

        //     background = node.getComponent(cc.SpriteComponent);
        //     if (!background) {
        //         background = node.addComponent(cc.SpriteComponent);
        //     }
        //     background.type = cc.SpriteComponent.Type.SLICED;

        //     node.parent = this.node;
        //     this._background = background;
        // }
        // background.spriteFrame = this._backgroundImage;
    }

    _createLabels() {
        if (!this._textLabel) {
            let node = this.node.getChildByName('TEXT_LABEL');
            if (!node) {
                node = new cc.NodeUI('TEXT_LABEL');
            }
            node.color = this._fontColor;
            node.parent = this.node;
            node.setAnchorPoint(0, 1);

            let textLabel = node.getComponent(LabelComponent);
            if (!textLabel) {
                textLabel = node.addComponent(LabelComponent);
            }
            textLabel.overflow = LabelComponent.Overflow.CLAMP;
            textLabel.fontSize = this._fontSize;
            textLabel.lineHeight = this.lineHeight;
            this._textLabel = textLabel;
        }

        if (!this._placeholderLabel) {
            let node = this.node.getChildByName('PLACEHOLDER_LABEL');
            if (!node) {
                node = new cc.NodeUI('PLACEHOLDER_LABEL');
            }
            node.color = this._placeholderFontColor;
            node.parent = this.node;
            node.setAnchorPoint(0, 1);

            let placeholderLabel = node.getComponent(LabelComponent);
            if (!placeholderLabel) {
                placeholderLabel = node.addComponent(LabelComponent);
            }
            placeholderLabel.overflow = LabelComponent.Overflow.CLAMP;
            placeholderLabel.fontSize = this._placeholderFontSize;
            placeholderLabel.string = this._placeholder;
            this._placeholderLabel = placeholderLabel;
        }
    }

    _resizeChildNodes() {
        let textLabelNode = this._textLabel.node,
            placeholderLabelNode = this._placeholderLabel.node,
            backgroundNode = this._background.node;

        textLabelNode.x = -this.node.width / 2;
        textLabelNode.y = this.node.height / 2;
        textLabelNode.width = this.node.width;
        textLabelNode.height = this.node.height;

        placeholderLabelNode.x = -this.node.width / 2;
        placeholderLabelNode.y = this.node.height / 2;
        placeholderLabelNode.width = this.node.width;
        placeholderLabelNode.height = this.node.height;

        backgroundNode.width = this.node.width;
        backgroundNode.height = this.node.height;
    }

    _showLabels() {
        let displayText = this._textLabel.string;
        this._textLabel.node.active = displayText !== '';
        this._placeholderLabel.node.active = displayText === '';
    }

    _hideLabels() {
        this._textLabel.node.active = false;
        this._placeholderLabel.node.active = false;
    }

    _updateString(text) {
        let textLabel = this._textLabel;
        // Not inited yet
        if (!textLabel) {
            return;
        }

        let displayText = text;
        if (displayText) {
            displayText = this._updateLabelStringStyle(displayText);
        }

        textLabel.string = displayText;
        this._impl.setString(text);
        if (!this._impl._editing && !this.stayOnTop) {
            this._showLabels();
        }
    }

    _updateLabelStringStyle(text, ignorePassword) {
        let inputFlag = this._inputFlag;
        if (!ignorePassword && inputFlag === InputFlag.PASSWORD) {
            let passwordString = '';
            let len = text.length;
            for (let i = 0; i < len; ++i) {
                passwordString += '\u25CF';
            }
            text = passwordString;
        }
        else if (inputFlag === InputFlag.INITIAL_CAPS_ALL_CHARACTERS) {
            text = text.toUpperCase();
        }
        else if (inputFlag === InputFlag.INITIAL_CAPS_WORD) {
            text = capitalize(text);
        }
        else if (inputFlag === InputFlag.INITIAL_CAPS_SENTENCE) {
            text = capitalizeFirstLetter(text);
        }

        return text;
    }

    editBoxEditingDidBegan() {
        this._hideLabels();
        cc.Component.EventHandler.emitEvents(this.editingDidBegan, this);
        this.node.emit('editing-did-began', this);
    }

    editBoxEditingDidEnded() {
        if (!this.stayOnTop) {
            this._showLabels();
        }
        cc.Component.EventHandler.emitEvents(this.editingDidEnded, this);
        this.node.emit('editing-did-ended', this);
    }

    editBoxTextChanged(text) {
        text = this._updateLabelStringStyle(text, true);
        this.string = text;
        cc.Component.EventHandler.emitEvents(this.textChanged, text, this);
        this.node.emit('text-changed', this);
    }

    editBoxEditingReturn() {
        cc.Component.EventHandler.emitEvents(this.editingReturn, this);
        this.node.emit('editing-return', this);
    }

    _onTouchBegan(event) {
        if (this._impl) {
            this._impl._onTouchBegan(event.touch);
        }
        event.stopPropagation();
    }

    _onTouchCancel(event) {
        if (this._impl) {
            this._impl._onTouchCancel();
        }
        event.stopPropagation();
    }

    _onTouchEnded(event) {
        if (this._impl) {
            this._impl._onTouchEnded();
        }
        event.stopPropagation();
    }

    /**
     * !#en Let the EditBox get focus
     * !#zh 让当前 EditBox 获得焦点
     * @method setFocus
     */
    setFocus() {
        if (this._impl) {
            this._impl.setFocus();
        }
    }

    /**
     * !#en Determine whether EditBox is getting focus or not.
     * !#zh 判断 EditBox 是否获得了焦点
     * Note: only available on Web at the moment.
     * @method isFocused
     */
    isFocused() {
        let isFocused = false;
        if (this._impl) {
            isFocused = this._impl.isFocused();
        }
        return isFocused;
    }

    update() {
        if (this._impl) {
            this._impl.update();
        }
    }
}

/**
 * !#en
 * Note: This event is emitted from the node to which the component belongs.
 * !#zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event editing-did-began
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * !#en
 * Note: This event is emitted from the node to which the component belongs.
 * !#zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event editing-did-ended
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * !#en
 * Note: This event is emitted from the node to which the component belongs.
 * !#zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event text-changed
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * !#en
 * Note: This event is emitted from the node to which the component belongs.
 * !#zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event editing-return
 * @param {Event.EventCustom} event
 * @param {EditBox} editbox - The EditBox component.
 */

/**
 * !#en if you don't need the EditBox and it isn't in any running Scene, you should
 * call the destroy method on this component or the associated node explicitly.
 * Otherwise, the created DOM element won't be removed from web page.
 * !#zh
 * 如果你不再使用 EditBox，并且组件未添加到场景中，那么你必须手动对组件或所在节点调用 destroy。
 * 这样才能移除网页上的 DOM 节点，避免 Web 平台内存泄露。
 * @example
 * editbox.node.parent = null;  // or  editbox.node.removeFromParent(false);
 * // when you don't need editbox anymore
 * editbox.node.destroy();
 * @method destroy
 * @return {Boolean} whether it is the first time the destroy being called
 */
