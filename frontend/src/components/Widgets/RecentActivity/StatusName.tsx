// interfaces
interface IProps {
  status: number;
}

const StatusName: React.FC<IProps> = ({ status }) => {
  if (status === 1) {
    return <span className='green'>Completed</span>;
  }

  if (status === 2) {
    return <span className='red'>Failed</span>;
  }

  return <span className='gray'>Pending</span>;
};

export default StatusName;