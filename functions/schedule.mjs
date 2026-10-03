// Myanmar UTC+06:30: 18:00, 19:00 and 20:00 local time.
export const DRAW_TIMES=Object.freeze({'2D':'11:30','3D':'12:30','4D':'13:30'});
export function cutoffFor(day,market){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!DRAW_TIMES[market])throw new Error('Invalid draw schedule');
 return new Date(day+'T'+DRAW_TIMES[market]+':00.000Z');
}
