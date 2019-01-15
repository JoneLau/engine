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

/**
 * !#en ToggleContainer is not a visiable UI component but a way to modify the behavior of a set of Toggles. <br/>
 * Toggles that belong to the same group could only have one of them to be switched on at a time.<br/>
 * Note: All the first layer child node containing the toggle component will auto be added to the container
 * !#zh ToggleContainer 不是一个可见的 UI 组件，它可以用来修改一组 Toggle 组件的行为。<br/>
 * 当一组 Toggle 属于同一个 ToggleContainer 的时候，任何时候只能有一个 Toggle 处于选中状态。<br/>
 * 注意：所有包含 Toggle 组件的一级子节点都会自动被添加到该容器中
 * @class ToggleContainer
 * @extends Component
 */

import { Component } from '../../../components/component';
import { ccclass, executeInEditMode, menu, property } from '../../../core/data/class-decorator';

@ccclass('cc.ToggleContainerComponent')
export default class ToggleContainerComponent extends Component {
    @property
    protected _allowSwitchOff = false;
    @property
    public toggleItems: Component[] = [];
    /**
     * !#en If this setting is true, a toggle could be switched off and on when pressed.
     * If it is false, it will make sure there is always only one toggle could be switched on
     * and the already switched on toggle can't be switched off.
     * !#zh 如果这个设置为 true， 那么 toggle 按钮在被点击的时候可以反复地被选中和未选中。
     * @property {Boolean} allowSwitchOff
     */
    @property
    get allowSwitchOff() {
        return this._allowSwitchOff;
    }

    set allowSwitchOff(value) {
        this._allowSwitchOff = value;
    }

    updateToggles(toggle) {
        this.toggleItems.forEach(function (item) {
            if (toggle.isChecked && item !== toggle) {
                item.isChecked = false;
            }
        });
    }

    _allowOnlyOneToggleChecked() {
        var isChecked = false;
        this.toggleItems.forEach(function (item) {
            if (isChecked) {
                item.isChecked = false;
            }
            else if (item.isChecked) {
                isChecked = true;
            }
        });

        return isChecked;
    }

    _makeAtLeastOneToggleChecked() {
        var isChecked = this._allowOnlyOneToggleChecked();

        if (!isChecked && !this.allowSwitchOff) {
            var toggleItems = this.toggleItems;
            if (toggleItems.length > 0) {
                toggleItems[0].check();
            }
        }
    }

    onEnable() {
        this.toggleItems = this.node.getComponentsInChildren(cc.ToggleComponent);
        this.node.on('child-added', this._allowOnlyOneToggleChecked, this);
        this.node.on('child-removed', this._makeAtLeastOneToggleChecked, this);
    }

    onDisable() {
        this.node.off('child-added', this._allowOnlyOneToggleChecked, this);
        this.node.off('child-removed', this._makeAtLeastOneToggleChecked, this);
    }

    start() {
        this._makeAtLeastOneToggleChecked();
    }
}
