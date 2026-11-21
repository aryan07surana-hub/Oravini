/** A Google authorization alone does not establish a usable YouTube channel. */
export function requireYoutubeChannel<T extends {id?:string|null}>(channel:T|undefined|null):T {
  if (!channel?.id) throw new Error("No YouTube channel was found for this Google account. Create a YouTube channel or choose the Google account that owns your channel, then reconnect.");
  return channel;
}
