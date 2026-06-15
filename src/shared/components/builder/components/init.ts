/**
 * Auto-register all builder components on import.
 */
import { CharacterMapBuilder } from './components/CharacterMapBuilder';
import { registerBuilderComponent } from './registry';

registerBuilderComponent('character_map', CharacterMapBuilder, 2);
