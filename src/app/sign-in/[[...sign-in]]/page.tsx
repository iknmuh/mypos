import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white">MyPOS</h1>
                    <p className="mt-2 text-slate-400">Kelola bisnis Anda dengan mudah</p>
                </div>
                <SignIn />
            </div>
        </div>
    );
}
