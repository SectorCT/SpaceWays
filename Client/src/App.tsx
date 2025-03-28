import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import './App.css'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas style={{ position: 'absolute', top: 0, left: 0 }}>
        <Stars radius={300} depth={60} count={10000} factor={7} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  )
}

export default App
