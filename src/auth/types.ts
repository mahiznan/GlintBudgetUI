// Web BudgetUser is intentionally a subset of the iOS BudgetUser model.
// Field names match iOS CodingKeys (user_id, photo_url) so we can decode
// Firestore documents directly in Stage 3+ without a mapping layer.
export interface BudgetUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  user_isPremium?: boolean; // Premium status from users collection
}

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: BudgetUser };
