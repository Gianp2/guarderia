import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';
import { UserProfile, UserRole } from '../types';
import { seedInitialDatabaseIfEmpty, INITIAL_USERS } from '../services/seedData';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isParent: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  switchSimulatedRole: (role: UserRole) => void;
  isSimulated: boolean;
  resetToRealAuth: () => void;
  seedDatabase: () => Promise<boolean>;
  updateLinkedChild: (childId: string) => void;
  unlinkChildrenForTesting: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(() => {
    // Default to admin for instant exploration if not signed in yet
    return (localStorage.getItem('nido_simulated_role') as UserRole) || 'admin';
  });

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            if (data.role === 'admin') {
              seedInitialDatabaseIfEmpty().catch(console.warn);
            }
          } else {
            // New user registration
            const isBootstrappedAdmin = user.email === 'gianpasquinelli19@gmail.com';
            const newProfile: UserProfile = {
              id: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
              role: isBootstrappedAdmin ? 'admin' : 'parent',
              isActive: true,
              photoURL: user.photoURL || undefined,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            if (isBootstrappedAdmin) {
              seedInitialDatabaseIfEmpty().catch(console.warn);
            }
          }
        } catch (err) {
          console.warn('Could not read user profile from Firestore, using fallback auth profile:', err);
          setUserProfile({
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Usuario',
            role: user.email === 'gianpasquinelli19@gmail.com' ? 'admin' : 'parent',
            isActive: true
          });
        }
      } else {
        // No real user logged in
        if (!simulatedRole) {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [simulatedRole]);

  // Handle simulated profiles when no real user or user explicitly selected a preview role
  useEffect(() => {
    if (!currentUser && simulatedRole) {
      if (simulatedRole === 'admin') {
        setUserProfile(INITIAL_USERS[0]);
      } else if (simulatedRole === 'teacher') {
        setUserProfile(INITIAL_USERS[1]);
      } else if (simulatedRole === 'parent') {
        setUserProfile(INITIAL_USERS[3]);
      }
    }
  }, [currentUser, simulatedRole]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      // clear simulation once real user logs in
      setSimulatedRole(null);
      localStorage.removeItem('nido_simulated_role');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setSimulatedRole(null);
      localStorage.removeItem('nido_simulated_role');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const switchSimulatedRole = (role: UserRole) => {
    setSimulatedRole(role);
    localStorage.setItem('nido_simulated_role', role);
    if (role === 'admin') {
      setUserProfile(INITIAL_USERS[0]);
    } else if (role === 'teacher') {
      setUserProfile(INITIAL_USERS[1]);
    } else if (role === 'parent') {
      setUserProfile(INITIAL_USERS[3]);
    }
  };

  const updateLinkedChild = (childId: string) => {
    setUserProfile(prev => {
      if (!prev) return null;
      const currentLinked = prev.linkedChildIds || [];
      const updatedLinked = currentLinked.includes(childId) ? currentLinked : [...currentLinked, childId];
      return {
        ...prev,
        linkedChildIds: updatedLinked
      };
    });
  };

  const unlinkChildrenForTesting = () => {
    setUserProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        linkedChildIds: []
      };
    });
  };

  const resetToRealAuth = () => {
    setSimulatedRole(null);
    localStorage.removeItem('nido_simulated_role');
    if (!currentUser) {
      setUserProfile(null);
    }
  };

  const seedDatabase = async () => {
    return await seedInitialDatabaseIfEmpty();
  };

  const activeRole: UserRole | null = simulatedRole || userProfile?.role || null;
  const isSimulated = !currentUser && simulatedRole !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: activeRole,
        loading,
        isAdmin: activeRole === 'admin',
        isTeacher: activeRole === 'teacher',
        isParent: activeRole === 'parent',
        signInWithGoogle,
        signOutUser,
        switchSimulatedRole,
        isSimulated,
        resetToRealAuth,
        seedDatabase,
        updateLinkedChild,
        unlinkChildrenForTesting
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
