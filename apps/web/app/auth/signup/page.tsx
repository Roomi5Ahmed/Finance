import { signup } from '../actions'

export default async function SignUpPage(props: { searchParams: Promise<{ message: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#000000] py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2
          className="mt-6 text-center text-3xl font-bold text-[#EFEFEF]"
          style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
        >
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}>
          Smart <span className="text-[#FF98A2]">Finance</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#181818] border border-white/5 px-4 py-8 sm:px-10">
          <form className="space-y-6" action={signup}>
            {searchParams?.message && (
              <p className="mt-4 p-4 bg-[#FF98A2]/10 text-[#FF98A2] text-center text-sm rounded-[11px] border border-[#FF98A2]/20">
                {searchParams.message}
              </p>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#8C8C8C]"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full appearance-none rounded-[11px] border border-white/10 bg-[#000000] px-3 py-2 placeholder-[#8C8C8C] text-[#EFEFEF] focus:border-[#FF98A2] focus:outline-none focus:ring-1 focus:ring-[#FF98A2]/20 sm:text-sm transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#8C8C8C]"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="block w-full appearance-none rounded-[11px] border border-white/10 bg-[#000000] px-3 py-2 placeholder-[#8C8C8C] text-[#EFEFEF] focus:border-[#FF98A2] focus:outline-none focus:ring-1 focus:ring-[#FF98A2]/20 sm:text-sm transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-[16px] border border-[#FF98A2] bg-[#FF98A2] px-4 py-2 text-sm font-medium text-[#000000] hover:bg-[#FF98A2]/90 focus:outline-none focus:ring-2 focus:ring-[#FF98A2] focus:ring-offset-2 focus:ring-offset-[#181818] transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
              >
                Sign up
              </button>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-[#8C8C8C]">Already have an account? </span>
              <a href="/auth/signin" className="font-medium text-[#FF98A2] hover:text-[#FF98A2]/80 transition-colors duration-[0.6s]">
                Sign in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
