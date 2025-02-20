import Navigation from './navigation/Navigation';
import { useAccount } from 'wagmi'


function App() {
  const { isConnected } = useAccount()
  console.log('isConnected', isConnected)

  return (
    <div className="App">
        <Navigation />
    </div>
  )
}

export default App