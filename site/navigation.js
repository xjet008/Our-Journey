// Back restores the chapter and place, while retaining answers and preferences.
export function rememberChapter(state){state.history.push({scene:state.scene,location:state.location,personalIndex:state.personalIndex,momentType:state.momentType});}
export function restoreChapter(state){
 const previous=state.history.pop();if(!previous)return false;
 if(typeof previous==='string')state.scene=previous;
 else{state.scene=previous.scene;state.location=previous.location;state.personalIndex=previous.personalIndex;state.momentType=previous.momentType;}
 return true;
}
