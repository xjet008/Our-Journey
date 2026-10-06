import test from 'node:test';import assert from 'node:assert/strict';
import {rememberChapter,restoreChapter} from '../site/navigation.js';
test('back restores the correct place and question while keeping personal choices',()=>{
 const state={scene:'conversation',location:'roses',personalIndex:0,history:[],answers:[{answer:'Our laughter'}],selectedPartnerDistance:0};
 rememberChapter(state);state.scene='explore';rememberChapter(state);state.location='grove';state.selectedPartnerDistance=55;
 assert.equal(restoreChapter(state),true);assert.equal(state.scene,'explore');assert.equal(state.location,'roses');
 restoreChapter(state);assert.equal(state.scene,'conversation');assert.equal(state.location,'roses');assert.equal(state.selectedPartnerDistance,55);assert.deepEqual(state.answers,[{answer:'Our laughter'}]);
});
test('existing saved histories remain compatible and consent can return without a loop',()=>{
 const state={scene:'explore',location:'stars',personalIndex:2,history:['distance']};rememberChapter(state);state.scene='moment';state.momentType='hug';
 restoreChapter(state);assert.equal(state.scene,'explore');assert.equal(state.location,'stars');assert.equal(state.history.length,1);
 restoreChapter(state);assert.equal(state.scene,'distance');assert.equal(state.location,'stars');assert.equal(restoreChapter(state),false);
});
