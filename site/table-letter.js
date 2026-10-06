// The next chapter belongs to the completed return, never to the close click.
// Reset and page exit revoke the token that owns lift/read/return.
export class TableLetter {
  constructor({lift,read,fold,restore,continueJourney,clear}){Object.assign(this,{lift,read,fold,restore,continueJourney,clear});this.current=null;}
  open(){
    if(this.current)return this.current.opening;
    const token={cancelled:false,phase:'opening'};this.current=token;
    token.opening=(async()=>{
      try{await this.lift(token);if(token.cancelled)return false;token.phase='reading';this.read(token);return true;}
      catch(error){if(!token.cancelled){this.cancel();throw error;}return false;}
    })();return token.opening;
  }
  close(){
    const token=this.current;if(!token)return Promise.resolve(false);
    if(token.closing)return token.closing;
    token.closing=(async()=>{
      try{
        await token.opening;if(token.cancelled)return false;
        token.phase='returning';await this.fold(token);if(token.cancelled)return false;
        await this.restore(token);if(token.cancelled)return false;
        this.clear(token);if(this.current===token)this.current=null;
        this.continueJourney();return true;
      }catch(error){if(!token.cancelled){this.cancel();throw error;}return false;}
    })();return token.closing;
  }
  cancel(){const token=this.current;if(!token)return;token.cancelled=true;this.clear(token);if(this.current===token)this.current=null;}
}
