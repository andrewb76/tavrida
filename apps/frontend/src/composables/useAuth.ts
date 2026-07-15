import { useLogto } from '@logto/vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  isLogtoConfigured,
  signInRedirectUri,
  signOutRedirectUri,
} from '@/config/logto';
import { setPostAuthRedirect } from '@/services/authRedirect';
import {
  resolveInvite,
  setPendingInviterId,
  setPendingInviteCodeId,
  type ResolvedInvite,
} from '@/services/invite';
import { useSessionStore } from '@/stores/session';

export type SignInWithInviteParams = {
  code?: string;
  token?: string;
  email?: string;
  redirectAfter?: string;
};

export type SignInOptions = {
  redirectAfter?: string;
  /** Open Logto sign-up form (requires registration enabled in Logto Console). */
  mode?: 'sign-in' | 'register';
};

function parseSignInArg(arg?: string | SignInOptions): SignInOptions {
  if (typeof arg === 'string') return { redirectAfter: arg };
  return arg ?? {};
}

export function useAuth() {
  const session = useSessionStore();
  const router = useRouter();
  const configured = isLogtoConfigured();

  if (configured) {
    const logto = useLogto();

    async function signInWithResolved(
      resolved: ResolvedInvite,
      redirectAfter?: string,
    ) {
      if (redirectAfter) setPostAuthRedirect(redirectAfter);
      if (resolved.inviterId) setPendingInviterId(resolved.inviterId);
      if (resolved.inviteCodeId) setPendingInviteCodeId(resolved.inviteCodeId);

      await logto.signIn({
        redirectUri: signInRedirectUri(),
        loginHint: resolved.email,
        ...(resolved.token
          ? { extraParams: { one_time_token: resolved.token } }
          : {}),
      });
    }

    async function signIn(arg?: string | SignInOptions) {
      const { redirectAfter, mode = 'sign-in' } = parseSignInArg(arg);
      if (redirectAfter) setPostAuthRedirect(redirectAfter);

      await logto.signIn({
        redirectUri: signInRedirectUri(),
        ...(mode === 'register' ? { firstScreen: 'register' as const } : {}),
      });
    }

    async function signUp(redirectAfter?: string) {
      await signIn({ redirectAfter, mode: 'register' });
    }

    async function signInWithInvite(params: SignInWithInviteParams) {
      const resolved = await resolveInvite({
        code: params.code,
        token: params.token,
        email: params.email,
      });
      await signInWithResolved(resolved, params.redirectAfter ?? '/app');
    }

    async function signOut() {
      session.stopImpersonation();
      session.clearProfile();
      const { useSubscriptionsStore } = await import('@/stores/subscriptions');
      useSubscriptionsStore().invalidate();
      await logto.signOut(signOutRedirectUri());
    }

    return {
      configured: true as const,
      isAuthenticated: logto.isAuthenticated,
      isLoading: logto.isLoading,
      isMember: computed(() => session.isMember),
      signIn,
      signUp,
      signInWithInvite,
      signOut,
    };
  }

  return {
    configured: false as const,
    isAuthenticated: computed(() => session.isAuthenticated),
    isLoading: computed(() => false),
    isMember: computed(() => session.isMember),
    signIn: async (arg?: string | SignInOptions) => {
      session.signInDev();
      const { redirectAfter } = parseSignInArg(arg);
      await router.push(redirectAfter ?? { name: 'member-home' });
    },
    signUp: async (redirectAfter?: string) => {
      session.signInDev();
      await router.push(redirectAfter ?? { name: 'member-home' });
    },
    signInWithInvite: async (params: SignInWithInviteParams) => {
      if (params.code || params.token) {
        const resolved = await resolveInvite({
          code: params.code,
          token: params.token,
          email: params.email,
        });
        if (resolved.inviterId) setPendingInviterId(resolved.inviterId);
        if (resolved.inviteCodeId) setPendingInviteCodeId(resolved.inviteCodeId);
      }
      session.signInDev();
      await router.push(params.redirectAfter ?? { name: 'member-home' });
    },
    signOut: () => {
      session.signOutDev();
      void import('@/stores/subscriptions').then(({ useSubscriptionsStore }) => {
        useSubscriptionsStore().invalidate();
      });
      void router.push({ name: 'landing' });
    },
  };
}
