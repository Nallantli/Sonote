import main.sono.io.Output;

public class StandardOutput extends Output {
	private final Listener thread;
	private final int boxID;

	public StandardOutput(final Listener thread, final int boxID) {
		this.thread = thread;
		this.boxID = boxID;
	}

	@Override
	public void print(final String s) {
		thread.sendData("OUT", s, boxID, null);
	}
}
