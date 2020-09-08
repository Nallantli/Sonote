import main.sono.io.Output;

public class StandardError extends Output {
	private final Listener thread;
	private final int id;

	public StandardError(final Listener thread, final int id) {
		this.thread = thread;
		this.id = id;
	}

	@Override
	public void print(final String s) {
		thread.sendData("ERR", s, id, null);
	}
}
