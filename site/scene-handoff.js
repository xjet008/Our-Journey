// Cover the outgoing scene before changing its geometry/camera. One handoff
// owns the swap; repeated clicks and arrivals share it, and reset cancels it.
export class SceneHandoff {
  constructor({cover,swap,reveal,clear}){Object.assign(this,{cover,swap,reveal,clear});this.current=null;}
  run(){
    if(this.current)return this.current.promise;
    const token={cancelled:false};this.current=token;
    token.promise=(async()=>{
      try{
        await this.cover(token);if(token.cancelled)return false;
        await this.swap(token);if(token.cancelled)return false;
        await this.reveal(token);return !token.cancelled;
      }catch(error){if(token.cancelled)return false;throw error;}
      finally{this.clear(token);if(this.current===token)this.current=null;}
    })();
    return token.promise;
  }
  cancel(){
    const token=this.current;if(!token)return;
    token.cancelled=true;this.clear(token);this.current=null;
  }
}
