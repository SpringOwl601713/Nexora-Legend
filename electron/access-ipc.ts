import { ipcMain, BrowserWindow } from 'electron';
import {
  checkAgencyAccess,
  founderLogin,
  listMembers,
  enableMember,
  revokeMember,
  readAccessState,
  type AccessState
} from './access';

export function registerAccessIpc(getWindow:()=>BrowserWindow|null){
  ipcMain.handle('access:state', async()=>readAccessState());
  ipcMain.handle('access:check', async(_e,tiktok:string)=>{
    const state = await checkAgencyAccess(tiktok);
    getWindow()?.webContents.send('access:status',state);
    return state;
  });
  ipcMain.handle('access:founderLogin', async(_e,password:string)=>founderLogin(password));
  ipcMain.handle('access:members', async(_e,token:string)=>listMembers(token));
  ipcMain.handle('access:enable', async(_e,token:string,tiktok:string,note:string)=>enableMember(token,tiktok,note));
  ipcMain.handle('access:revoke', async(_e,token:string,tiktok:string)=>revokeMember(token,tiktok));
}

export function startRevocationWatch(getWindow:()=>BrowserWindow|null){
  let stopped = false;
  const tick = async()=>{
    if(stopped) return;
    const state = readAccessState();
    if(state.tiktok && state.allowed){
      const fresh:AccessState = await checkAgencyAccess(state.tiktok);
      if(!fresh.allowed){
        getWindow()?.webContents.send('access:status',fresh);
      }
    }
    if(!stopped) setTimeout(tick,5000);
  };
  setTimeout(tick,5000);
  return ()=>{stopped=true;};
}
