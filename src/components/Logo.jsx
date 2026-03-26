import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Logo.css'

export default function Logo({ to = '/', onClick }) {
  return (
    <Link to={to} className="logo" onClick={onClick}>
      <div className="logo__icon">
        <Zap className="logo__zap" />
      </div>
      <span className="logo__text">SHAZAM</span>
    </Link>
  )
}
