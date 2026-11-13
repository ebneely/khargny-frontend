// A collection is the team's (owner null, always public) or one device's own (private until made public).
export type CollectionAccess = { owner: string | null; pub: boolean };

// who may open /c/:slug: the team's and public ones are open to anyone, a private one only to its owner (the server answers 404 to others)
export const canOpen = (c: CollectionAccess, device: string) => c.owner === null || c.pub || c.owner === device;

// sharing needs a public link: the owner of a private collection is asked to make it public first
export const shareStep = (c: CollectionAccess, device: string): 'share' | 'makePublicFirst' | 'none' =>
  !canOpen(c, device) ? 'none' : c.owner === device && !c.pub ? 'makePublicFirst' : 'share';
