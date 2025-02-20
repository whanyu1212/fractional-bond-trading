// interfaces
interface IProps {
  status: number;
}

const StatusName: React.FC<IProps> = ({ status }) => {
  if (status === 1) {
    return <span className='green'>Limit available</span>;
  }

  return <span className='red'>Insufficient balance</span>;
};

export default StatusName;