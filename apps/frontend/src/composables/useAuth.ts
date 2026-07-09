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
  type ResolvedInvite,
} from '@/services/invite';
import { useSessionStore } from '@/stores/session';

export type SignInWithInviteParams = {
  code?: string;
  token?: string;
  email?: string;
  redirectAfter?: string;
};

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

      await logto.signIn({
        redirectUri: signInRedirectUri(),
        loginHint: resolved.email,
        ...(resolved.token
          ? { extraParams: { one_time_token: resolved.token } }
          : {}),
      });
    }

    async function signIn(redirectAfter?: string) {
      if (redirectAfter) setPostAuthRedirect(redirectAfter);
      await logto.signIn(signInRedirectUri());
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
      session.clearProfile();
      await logto.signOut(signOutRedirectUri());
    }

    return {
      configured: true as const,
      isAuthenticated: logto.isAuthenticated,
      isLoading: logto.isLoading,
      isMember: computed(() => session.isMember),
      signIn,
      signInWithInvite,
      signOut,
    };
  }

  return {
    configured: false as const,
    isAuthenticated: computed(() => session.isAuthenticated),
    isLoading: computed(() => false),
    isMember: computed(() => session.isMember),
    signIn: async (redirectAfter?: string) => {
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
      }
      session.signInDev();
      await router.push(params.redirectAfter ?? { name: 'member-home' });
    },
    signOut: () => {
      session.signOutDev();
      void router.push({ name: 'landing' });
    },
  };
}
