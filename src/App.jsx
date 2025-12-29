import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import Dashboard from "./Dashboard"

export default function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
  }, [])

  if (!session) return <Auth />
  return <Dashboard />
}

function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const login = async () => {
    const { error } =
      await supabase.auth.signInWithPassword({ email, password })

    if (error) alert(error.message)
    else location.reload()
  }

  const register = async () => {
    const { error } =
      await supabase.auth.signUp({ email, password })

    if (error) alert(error.message)
    else alert("Registered. Login now.")
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Login / Register</h2>

      <input
        placeholder="Email"
        onChange={e => setEmail(e.target.value)}
      /><br/><br/>

      <input
        type="password"
        placeholder="Password"
        onChange={e => setPassword(e.target.value)}
      /><br/><br/>

      <button onClick={login}>Login</button>
      <button onClick={register}>Register</button>
    </div>
  )
}
