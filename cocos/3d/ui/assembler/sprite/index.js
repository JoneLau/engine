// @ts-check

import Simple from './simple';
import Sliced from './sliced';
import Tiled from './tiled';
import RadialFill from './radial-filled';
import BarFill from './bar-filled';
import Sprite from '../CCSprite';

let Assembler = {
    getAssembler(comp) {
        if (comp._type === Sprite.Type.SLICED) {
            return Sliced;
        } else if (comp._type === Sprite.Type.TILED) {
            return Tiled;
        } else if (comp._type === Sprite.Type.FILLED) {
            if (comp._fillType === Sprite.FillType.RADIAL) {
                return RadialFill;
            } else {
                return BarFill;
            }
        } else {
            return Simple;
        }
    }
}

export default Assembler;
