import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

/* ---------- UNQID ---------- */
const genUNQID = () => {
  const d = new Date()
  const pad = n => n.toString().padStart(2, "0")
  const ts = `${pad(d.getHours())}:${pad(d.getMinutes())}-${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `${ts}-${rand}`
}

export default function Dashboard() {
  const [page, setPage] = useState("home")
  const [rows, setRows] = useState([])

  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [type, setType] = useState("credit")
  const [txnId, setTxnId] = useState("")

  const [editId, setEditId] = useState(null)

  const [profile, setProfile] = useState({ name: "", photo: "" })

  /* ---------- LOAD ---------- */
  useEffect(() => {
    const saved = localStorage.getItem("profile")
    if (saved) setProfile(JSON.parse(saved))
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })

    setRows(data || [])
  }

  /* ---------- ADD / UPDATE ---------- */
  const addOrUpdate = async () => {
    if (!amount || !txnId) return alert("Amount & Transaction ID required")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("Not authenticated")

    if (editId) {
      await supabase
        .from("transactions")
        .update({ amount, reason, type, transaction_id: txnId })
        .eq("id", editId)

      setEditId(null)
    } else {
      await supabase.from("transactions").insert({
        user_id: user.id,
        amount: Number(amount),
        type,
        reason,
        transaction_id: txnId,
        unqid: genUNQID()
      })
    }

    resetForm()
    loadTransactions()
  }

  const resetForm = () => {
    setAmount("")
    setReason("")
    setTxnId("")
    setType("credit")
    setEditId(null)
  }

  /* ---------- DELETE ---------- */
  const deleteOne = async (id) => {
    if (!confirm("Delete this transaction?")) return
    await supabase.from("transactions").delete().eq("id", id)
    loadTransactions()
  }

  /* ---------- RESET ALL ---------- */
  const resetAll = async () => {
    if (!confirm("⚠️ Delete ALL transactions?")) return
    await supabase.from("transactions").delete().neq("id", "")
    loadTransactions()
  }

  /* ---------- PHOTO UPLOAD ---------- */
  const uploadPhoto = async (file) => {
    if (!file) return
    const ext = file.name.split(".").pop()
    const name = `${Date.now()}.${ext}`

    const { error } = await supabase.storage.from("avatars").upload(name, file)
    if (error) return alert(error.message)

    const { data } = supabase.storage.from("avatars").getPublicUrl(name)
    const updated = { ...profile, photo: data.publicUrl }

    setProfile(updated)
    localStorage.setItem("profile", JSON.stringify(updated))
  }

  const saveProfile = () => {
    localStorage.setItem("profile", JSON.stringify(profile))
    alert("Profile saved")
  }

  const logout = async () => {
    await supabase.auth.signOut()
    location.reload()
  }

  const earned = rows.filter(r=>r.type==="credit").reduce((a,b)=>a+b.amount,0)
  const spent  = rows.filter(r=>r.type==="debit").reduce((a,b)=>a+b.amount,0)

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 p-6">
        {profile.photo && <img src={profile.photo} className="w-16 h-16 rounded-full mb-2" />}
        <p className="font-semibold mb-6">{profile.name || "User"}</p>

        <nav className="space-y-3">
          <button onClick={()=>setPage("home")} className="w-full text-left">Home</button>
          <button onClick={()=>setPage("expenses")} className="w-full text-left">Expenses</button>
          <button onClick={()=>setPage("settings")} className="w-full text-left">Settings</button>
          <button onClick={logout} className="w-full text-left text-red-400">Logout</button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8">

        {/* HOME */}
        {page==="home" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Stat title="Earned" value={earned}/>
              <Stat title="Spent" value={spent}/>
              <Stat title="Balance" value={earned-spent}/>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl mt-6">
              <h3 className="mb-4">{editId ? "Edit" : "Add"} Transaction</h3>

              <div className="grid grid-cols-6 gap-3">
                <select className="bg-slate-800 p-2 rounded" value={type}
                  onChange={e=>setType(e.target.value)}>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>

                <input className="bg-slate-800 p-2 rounded" placeholder="Amount"
                  value={amount} onChange={e=>setAmount(e.target.value)} />

                <input className="bg-slate-800 p-2 rounded" placeholder="Transaction ID"
                  value={txnId} onChange={e=>setTxnId(e.target.value)} />

                <input className="bg-slate-800 p-2 rounded" placeholder="Reason"
                  value={reason} onChange={e=>setReason(e.target.value)} />

                <button onClick={addOrUpdate} className="bg-emerald-500 rounded">
                  {editId ? "Update" : "Add"}
                </button>
                <button onClick={resetForm} className="bg-slate-700 rounded">
                  Reset
                </button>
              </div>
            </div>
          </>
        )}

        {/* EXPENSES */}
        {page==="expenses" && (
          <div className="bg-slate-900 p-6 rounded-xl">
            <h2 className="mb-4">All Transactions</h2>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th>Date</th><th>Type</th><th>Amount</th><th>Txn ID</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r=>(
                  <tr key={r.id} className="border-t border-slate-800">
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>{r.type}</td>
                    <td>₹{r.amount}</td>
                    <td>{r.transaction_id}</td>
                    <td>
                      <button
                        onClick={()=>{
                          setEditId(r.id)
                          setAmount(r.amount)
                          setReason(r.reason)
                          setType(r.type)
                          setTxnId(r.transaction_id)
                          setPage("home")
                        }}
                        className="text-blue-400 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={()=>deleteOne(r.id)}
                        className="text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SETTINGS */}
        {page==="settings" && (
          <div className="bg-slate-900 p-6 rounded-xl max-w-md">
            <h2 className="text-xl mb-4">Settings</h2>

            <input
              className="bg-slate-800 p-2 rounded w-full mb-3"
              placeholder="Name"
              value={profile.name}
              onChange={e=>setProfile({...profile, name:e.target.value})}
            />

            <input
              type="file"
              className="bg-slate-800 p-2 rounded w-full mb-3"
              onChange={e=>uploadPhoto(e.target.files[0])}
            />

            <button onClick={saveProfile}
              className="bg-emerald-500 p-2 rounded w-full mb-3">
              Save Profile
            </button>

            <button onClick={resetAll}
              className="bg-red-600 p-2 rounded w-full">
              Reset ALL Transactions
            </button>
          </div>
        )}

      </main>
    </div>
  )
}

function Stat({ title, value }) {
  return (
    <div className="bg-slate-900 p-4 rounded-xl">
      <p className="text-slate-400">{title}</p>
      <p className="text-2xl font-semibold">₹{value}</p>
    </div>
  )
}
