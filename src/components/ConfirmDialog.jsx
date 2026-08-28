import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', destructive = false, onCancel, onConfirm }) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="modal-copy">{message}</p>
      <div className="modal-actions">
        <button className="button ghost" onClick={onCancel}>Cancel</button>
        <button className={`button ${destructive ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  );
}
