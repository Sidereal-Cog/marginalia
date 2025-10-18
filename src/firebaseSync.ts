import { db } from './firebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Note, UrlContext, NoteScope } from './types';

export class FirebaseSync {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }

  private buildFirestoreKey(scope: NoteScope, context: UrlContext): string {
    // Replace forward slashes with tilde to avoid Firestore path conflicts
    const escapePath = (path: string) => path.replace(/\//g, '~');
    
    switch (scope) {
      case 'browser':
        return 'browser';
      case 'domain':
        return `domain_${context.domain}`;
      case 'subdomain':
        return `subdomain_${context.subdomain}`;
      case 'page':
        return `page_${context.subdomain}${escapePath(context.path)}`;
      default:
        return 'browser';
    }
  }

  async saveNotes(scope: NoteScope, context: UrlContext, notes: Note[]): Promise<void> {
    const contextKey = this.buildFirestoreKey(scope, context);
    const contextRef = doc(db, `users/${this.userId}/notes/${contextKey}`);
    
    await setDoc(contextRef, {
      notes: notes.map(note => ({
        id: note.id,
        text: note.text,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      })),
      updatedAt: Date.now()
    });
  }

  async loadNotes(scope: NoteScope, context: UrlContext): Promise<Note[]> {
    const contextKey = this.buildFirestoreKey(scope, context);
    const contextRef = doc(db, `users/${this.userId}/notes/${contextKey}`);
    
    const snapshot = await getDoc(contextRef);
    if (!snapshot.exists()) return [];
    
    const data = snapshot.data();
    return (data?.notes || []) as Note[];
  }

  subscribeToScope(
    scope: NoteScope, 
    context: UrlContext, 
    callback: (notes: Note[]) => void
  ): Unsubscribe {
    const contextKey = this.buildFirestoreKey(scope, context);
    const contextRef = doc(db, `users/${this.userId}/notes/${contextKey}`);
    
    return onSnapshot(contextRef, (snapshot) => {
      const data = snapshot.data();
      const notes = (data?.notes || []) as Note[];
      callback(notes);
    });
  }

  async migrateLocalNotes(): Promise<void> {
    const allData = await chrome.storage.local.get(null);
    
    // Helper to escape paths
    const escapePath = (path: string) => path.replace(/\//g, '~');
    
    for (const [key, notes] of Object.entries(allData)) {
      if (!Array.isArray(notes) || !key.startsWith('notes:')) continue;
      
      // Parse the storage key format: notes:browser, notes:domain:example.com, etc.
      const parts = key.split(':');
      if (parts.length < 2) continue;
      
      const scopeType = parts[1];
      let contextKey: string;
      
      if (scopeType === 'browser') {
        contextKey = 'browser';
      } else if (scopeType === 'domain' && parts.length >= 3) {
        contextKey = `domain_${parts[2]}`;
      } else if (scopeType === 'subdomain' && parts.length >= 3) {
        contextKey = `subdomain_${parts[2]}`;
      } else if (scopeType === 'page' && parts.length >= 3) {
        const pagePath = parts.slice(2).join(':');
        contextKey = `page_${escapePath(pagePath)}`;
      } else {
        continue;
      }
      
      // Upload to Firestore
      const contextRef = doc(db, `users/${this.userId}/notes/${contextKey}`);
      await setDoc(contextRef, {
        notes: notes,
        updatedAt: Date.now()
      });
    }
    
    // Mark migration as complete
    await chrome.storage.local.set({ '_migrated_to_firebase': true });
  }
}