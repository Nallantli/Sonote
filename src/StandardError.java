import main.sono.io.Output;

public class StandardError extends Output {
	private final Listener thread;
	private final int boxID;

	public StandardError(final Listener thread, final int boxID) {
		this.thread = thread;
		this.boxID = boxID;
	}

	@Override
	public void print(final String s) {
		thread.sendData("ERR", s, boxID, null);
	}
}
