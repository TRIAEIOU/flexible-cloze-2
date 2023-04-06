import {FC2} from './fc2'
declare var __TEMPLATE_SIDE__: 'front'|'back'
declare var config
declare var fc2: FC2|undefined
fc2 ||= new FC2
fc2.load(config, __TEMPLATE_SIDE__)
