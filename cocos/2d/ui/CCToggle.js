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
import ButtonComponent from './CCButton';
import { ccclass, menu, executionOrder, executeInEditMode, property } from '../../core/data/class-decorator';
import ToggleGroupComponent from './CCToggleGroup';
import * as js from '../../core/utils/js';
import NodeUI from '../../scene-graph/node-2d';

/**
 * !#en The toggle component is a CheckBox, when it used together with a ToggleGroup, it
 * could be treated as a RadioButton.
 * !#zh Toggle 是一个 CheckBox，当它和 ToggleGroup 一起使用的时候，可以变成 RadioButton。
 * @class Toggle
 * @extends Button
 */
@ccclass('cc.ToggleComponent')
@executionOrder(100)
@menu('UI/Toggle')
@executeInEditMode
export default class ToggleComponent extends ButtonComponent {
    @property
    _isChecked = true;
    @property
    _toggleGroup = null;
    @property
    _checkMark = null;
    @property
    _checkEvents = [];

    /**
     * !#en When this value is true, the check mark component will be enabled, otherwise
     * the check mark component will be disabled.
     * !#zh 如果这个设置为 true，则 check mark 组件会处于 enabled 状态，否则处于 disabled 状态。
     * @property {Boolean} isChecked
     */
    @property
    get isChecked() {
        return this._isChecked;
    }

    set isChecked(value) {
        if (this._isChecked === value) {
            return
        }

        this._isChecked = value
        this._updateCheckMark();
    }

    /**
     * !#en The toggle group which the toggle belongs to, when it is null, the toggle is a CheckBox.
     * Otherwise, the toggle is a RadioButton.
     * !#zh Toggle 所属的 ToggleGroup，这个属性是可选的。如果这个属性为 null，则 Toggle 是一个 CheckBox，
     * 否则，Toggle 是一个 RadioButton。
     * @property {ToggleGroup} toggleGroup
     */
    @property({
        type: ToggleGroupComponent
    })
    get toggleGroup() {
        return this._toggleGroup;
    }

    set toggleGroup(value) {
        if (this._toggleGroup === value) {
            return;
        }

        if (this._toggleGroup) {
            this._toggleGroup.removeToggle(this);
        }
        this._toggleGroup = value;
        if (this.toggleGroup && this.toggleGroup.enabled) {
            this.toggleGroup.addToggle(this);
        }
    }

    /**
     * !#en The image used for the checkmark.
     * !#zh Toggle 处于选中状态时显示的图片
     * @property {Sprite} checkMark
     */
    @property({
        type: NodeUI
    })
    get checkMark() {
        return this._checkMark;
    }

    set checkMark(value) {
        if (this._checkMark === value) {
            return;
        }

        this._checkMark = value;
    }

    /**
     * !#en If Toggle is clicked, it will trigger event's handler
     * !#zh Toggle 按钮的点击事件列表。
     * @property {Component.EventHandler[]} checkEvents
     */
    @property({
        type: cc.Component.EventHandler
    })
    get checkEvents() {
        return this._checkEvents;
    }

    set checkEvents(value) {
        this._checkEvents = value;
    }

    set _resizeToTarget(value) {
        if (value) {
            this._resizeNodeToTargetNode();
        }
    }

    onEnable() {
        super.onEnable();
        if (!CC_EDITOR) {
            this._registerToggleEvent();
        }

        // hack
        this._checkMark = this.node.getComponentInChildren(cc.RenderComponent);

        if (this._toggleGroup && this._toggleGroup.enabled) {
            this._toggleGroup.addToggle(this);
        }
    }

    onDisable() {
        super.onEnable();
        if (!CC_EDITOR) {
            this._unregisterToggleEvent();
        }
        if (this.toggleGroup && this.toggleGroup.enabled) {
            this.toggleGroup.removeToggle(this);
        }
    }

    _updateCheckMark() {
        if (this._checkMark) {
            this._checkMark.node.active = !!this.isChecked;
        }
    }

    // _updateDisabledState() {
    //     this._super();

    //     if (this._checkMark) {
    //         this._checkMark.setState(0);
    //     }
    //     if (this.enableAutoGrayEffect) {
    //         if (this._checkMark && !this.interactable) {
    //             this._checkMark.setState(1);
    //         }
    //     }
    // }

    _registerToggleEvent() {
        this.node.on('click', this.toggle, this);
    }

    _unregisterToggleEvent() {
        this.node.off('click', this.toggle, this);
    }

    toggle(event) {
        var group = this.toggleGroup || this._toggleContainer;

        if (group && group.enabled && this.isChecked) {
            if (!group.allowSwitchOff) {
                return;
            }
        }

        this.isChecked = !this.isChecked;

        this._updateCheckMark();

        if (group && group.enabled) {
            group.updateToggles(this);
        }

        this._emitToggleEvents(event);
    }

    _emitToggleEvents() {
        this.node.emit('toggle', this);
        if (this.checkEvents) {
            cc.Component.EventHandler.emitEvents(this.checkEvents, this);
        }
    }

    /**
     * !#en Make the toggle button checked.
     * !#zh 使 toggle 按钮处于选中状态
     * @method check
     */
    check() {
        var group = this.toggleGroup || this._toggleContainer;

        if (group && group.enabled && this.isChecked) {
            if (!group.allowSwitchOff) {
                return;
            }
        }

        this.isChecked = true;

        if (group && group.enabled) {
            group.updateToggles(this);
        }

        this._emitToggleEvents();
    }

    /**
     * !#en Make the toggle button unchecked.
     * !#zh 使 toggle 按钮处于未选中状态
     * @method uncheck
     */
    uncheck() {
        var group = this.toggleGroup || this._toggleContainer;

        if (group && group.enabled && this.isChecked) {
            if (!group.allowSwitchOff) {
                return;
            }
        }

        this.isChecked = false;

        this._emitToggleEvents();
    }
}

// cc.Toggle = module.exports = Toggle;


// var js = require('../platform/js');

// js.get(Toggle.prototype, '_toggleContainer',
//     function () {
//         var parent = this.node.parent;
//         if (cc.Node.isNode(parent)) {
//             return parent.getComponent(cc.ToggleContainer);
//         }
//         return null;
//     }
// );

/**
 * !#en
 * Note: This event is emitted from the node to which the component belongs.
 * !#zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event toggle
 * @param {Event.EventCustom} event
 * @param {Toggle} toggle - The Toggle component.
 */
